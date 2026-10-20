// CareerConnect — job controller (STEP 7; delete-cascade STEP 15)
// Public: GET /api/jobs (active only) + GET /api/jobs/:id
// Recruiter: GET /api/jobs/mine + POST/PUT/DELETE on their OWN jobs
const path = require('path');
const fs = require('fs');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User'); // saved-list cleanup on delete (STEP 18)
const { UPLOAD_DIR } = require('../middleware/uploadMiddleware');

const JOB_TYPES = ['Full Time', 'Part Time', 'Internship', 'Contract', 'Remote'];
const JOB_STATUSES = ['active', 'closed', 'draft'];

// Escape user input before putting it in a RegExp (searching "C++" must not crash)
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Accept a single string or an array for list fields (skills, requirements, …)
const toStringArray = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [String(value).trim()];
};

// Coerce numeric fields so "800000" (string) works like 800000 (number)
const normalizeNumbers = (body) => {
  for (const field of ['salaryMin', 'salaryMax', 'experience']) {
    if (body[field] !== undefined && body[field] !== '' && typeof body[field] !== 'number') {
      body[field] = Number(body[field]);
    }
  }
};

const isFutureDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  salary_high: { salaryMax: -1 },
  salary_low: { salaryMin: 1 },
  deadline: { deadline: 1 },
};

// Shared filter builder (spec §29).
// Supports: search, location, jobType, category, experience, salaryMin/Max, skills
const buildFilters = (query) => {
  const filter = {};

  // Keyword search across title, company, location, category, description, skills.
  // Regex (not $text) so PARTIAL words match — better for typeahead search boxes.
  if (query.search && query.search.trim()) {
    const rx = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [
      { title: rx },
      { company: rx },
      { location: rx },
      { category: rx },
      { description: rx },
      { skills: rx },
    ];
  }
  if (query.location && query.location.trim()) {
    filter.location = new RegExp(escapeRegex(query.location.trim()), 'i');
  }
  if (query.jobType && query.jobType.trim()) {
    filter.jobType = new RegExp(`^${escapeRegex(query.jobType.trim())}$`, 'i');
  }
  if (query.category && query.category.trim()) {
    filter.category = new RegExp(`^${escapeRegex(query.category.trim())}$`, 'i');
  }
  // experience=N → jobs needing AT MOST N years (what a candidate with N years can do)
  if (query.experience !== undefined && query.experience !== '') {
    const years = Number(query.experience);
    if (!Number.isNaN(years)) filter.experience = { $lte: years };
  }
  // Salary overlap: the job's range must intersect the requested range
  if (query.salaryMin !== undefined && query.salaryMin !== '') {
    const min = Number(query.salaryMin);
    if (!Number.isNaN(min)) filter.salaryMax = { $gte: min };
  }
  if (query.salaryMax !== undefined && query.salaryMax !== '') {
    const max = Number(query.salaryMax);
    if (!Number.isNaN(max)) filter.salaryMin = { $lte: max };
  }
  // skills=Python,React → jobs having ANY of them (case-insensitive)
  if (query.skills && query.skills.trim()) {
    const list = query.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length > 0) {
      filter.skills = { $in: list.map((s) => new RegExp(`^${escapeRegex(s)}$`, 'i')) };
    }
  }
  return filter;
};

const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

// Shared list runner: filter + sort + paginate + recruiter name
const runJobQuery = async (filter, query) => {
  const { page, limit, skip } = parsePagination(query);
  const sort = SORT_OPTIONS[query.sort] || SORT_OPTIONS.newest;
  const [total, jobs] = await Promise.all([
    Job.countDocuments(filter),
    Job.find(filter).sort(sort).skip(skip).limit(limit).populate('postedBy', 'name email'),
  ]);
  return {
    jobs,
    pagination: { total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) },
  };
};

// Validate a job payload. On update, only provided fields are checked.
// `existing` (the stored job) is used for cross-field checks like salary range.
const validateJobInput = (body, existing = null) => {
  const isUpdate = !!existing;

  if (!isUpdate) {
    const required = [
      'title',
      'company',
      'location',
      'jobType',
      'category',
      'description',
      'deadline',
    ];
    const missing = required.filter((f) => body[f] === undefined || body[f] === '');
    if (missing.length > 0) return `Missing required fields: ${missing.join(', ')}`;
  }

  for (const field of ['title', 'company', 'location', 'category', 'description']) {
    if (body[field] !== undefined && String(body[field]).trim() === '') {
      return `${field} cannot be empty`;
    }
  }
  if (body.jobType !== undefined && !JOB_TYPES.includes(body.jobType)) {
    return `jobType must be one of: ${JOB_TYPES.join(', ')}`;
  }
  if (body.status !== undefined && !JOB_STATUSES.includes(body.status)) {
    return `status must be one of: ${JOB_STATUSES.join(', ')}`;
  }
  for (const field of ['salaryMin', 'salaryMax', 'experience']) {
    if (
      body[field] !== undefined &&
      (typeof body[field] !== 'number' || Number.isNaN(body[field]) || body[field] < 0)
    ) {
      return `${field} must be a number greater than or equal to 0`;
    }
  }
  const min = body.salaryMin ?? existing?.salaryMin ?? 0;
  const max = body.salaryMax ?? existing?.salaryMax ?? 0;
  if (max < min) return 'salaryMax cannot be less than salaryMin';
  if (body.deadline !== undefined && !isFutureDate(body.deadline)) {
    return 'deadline must be a valid date, today or in the future';
  }
  return null;
};

// @desc    List ACTIVE jobs (public) with search/filter/sort/pagination
// @route   GET /api/jobs
const getJobs = async (req, res, next) => {
  try {
    const filter = buildFilters(req.query);
    filter.status = 'active'; // public listing NEVER shows drafts/closed (?status= is ignored)
    const { jobs, pagination } = await runJobQuery(filter, req.query);
    res
      .status(200)
      .json({ success: true, message: 'Jobs fetched successfully', data: { jobs, pagination } });
  } catch (error) {
    next(error);
  }
};

// @desc    List the logged-in recruiter's OWN jobs (any status)
// @route   GET /api/jobs/mine
const getMyJobs = async (req, res, next) => {
  try {
    const filter = buildFilters(req.query);
    filter.postedBy = req.user._id;
    // Recruiters may narrow their own list: ?status=active|closed|draft
    if (req.query.status && JOB_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const { jobs, pagination } = await runJobQuery(filter, req.query);
    res
      .status(200)
      .json({ success: true, message: 'Your jobs fetched successfully', data: { jobs, pagination } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get one job by id (public for active/closed; drafts are owner-only)
// @route   GET /api/jobs/:id
const getJobById = async (req, res, next) => {
  try {
    let job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    // Drafts: owner only — everyone else gets 404 (not 403) so draft
    // existence isn't leaked. Closed jobs stay publicly viewable so past
    // applicants can revisit them; new applications are blocked in STEP 11.
    const isOwner = req.user && job.postedBy.toString() === req.user._id.toString();
    if (job.status === 'draft' && !isOwner) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    job = await job.populate('postedBy', 'name email');
    // STEP 18 — viewer state for the details page. optionalAuth has already
    // loaded the User doc, so "is it in my saved list?" costs ZERO extra
    // queries. (Recruiters never populate savedJobs → flag is false.)
    const jobOut = job.toJSON();
    jobOut.savedByViewer = !!((req.user?.savedJobs) || []).some(
      (id) => id.toString() === job._id.toString()
    );
    res
      .status(200)
      .json({ success: true, message: 'Job fetched successfully', data: { job: jobOut } });
  } catch (error) {
    next(error); // CastError (malformed id) → 404 via errorMiddleware
  }
};

// @desc    Create a job (recruiter only)
// @route   POST /api/jobs
const createJob = async (req, res, next) => {
  try {
    normalizeNumbers(req.body);
    const error = validateJobInput(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const job = await Job.create({
      title: req.body.title,
      company: req.body.company,
      location: req.body.location,
      salaryMin: req.body.salaryMin ?? 0,
      salaryMax: req.body.salaryMax ?? 0,
      jobType: req.body.jobType,
      category: req.body.category,
      experience: req.body.experience ?? 0,
      description: req.body.description,
      responsibilities: toStringArray(req.body.responsibilities),
      requirements: toStringArray(req.body.requirements),
      skills: toStringArray(req.body.skills),
      deadline: req.body.deadline,
      status: req.body.status || 'active',
      postedBy: req.user._id, // owner is ALWAYS the logged-in recruiter, never the body
    });

    await job.populate('postedBy', 'name email');
    res.status(201).json({ success: true, message: 'Job created successfully', data: { job } });
  } catch (error) {
    next(error);
  }
};

// Fields a recruiter may change (postedBy is deliberately excluded)
const UPDATABLE_FIELDS = [
  'title',
  'company',
  'location',
  'salaryMin',
  'salaryMax',
  'jobType',
  'category',
  'experience',
  'description',
  'responsibilities',
  'requirements',
  'skills',
  'deadline',
  'status',
];

// @desc    Update a job (owner recruiter only — also used to close/reopen)
// @route   PUT /api/jobs/:id
const updateJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: 'You can only edit jobs you posted' });
    }

    normalizeNumbers(req.body);
    const error = validateJobInput(req.body, job);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    for (const field of UPDATABLE_FIELDS) {
      if (req.body[field] !== undefined) job[field] = req.body[field];
    }
    for (const field of ['responsibilities', 'requirements', 'skills']) {
      if (req.body[field] !== undefined) job[field] = toStringArray(req.body[field]);
    }
    await job.save();

    await job.populate('postedBy', 'name email');
    res.status(200).json({ success: true, message: 'Job updated successfully', data: { job } });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a job (owner recruiter only) — STEP 15: cascades applications
// @route   DELETE /api/jobs/:id
const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: 'You can only delete jobs you posted' });
    }

    // CASCADE: applications belong to this job. Leaving them behind would
    // create orphans — every read path starts from the job, so those resume
    // files could never be fetched (or unlinked) again. Collect the on-disk
    // names first, then delete DB rows, then the files.
    const applications = await Application.find({ job: job._id }).select('resume.filename');
    await Application.deleteMany({ job: job._id });
    await job.deleteOne();
    // STEP 18: saved-job lists self-clean too (plain $pull on every user —
    // cheap, idempotent, keeps the ref array from pointing at nothing).
    await User.updateMany({}, { $pull: { savedJobs: job._id } });

    // File removal is best-effort: the database is already consistent, so a
    // missing/unlinkable file must not turn this into a 500. The filenames
    // are server-generated (Date-now-hash.ext), never user input.
    let removedFiles = 0;
    for (const application of applications) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, application.resume.filename));
        removedFiles += 1;
      } catch {
        /* already gone — nothing else to clean up */
      }
    }

    const n = applications.length;
    res.status(200).json({
      success: true,
      message: `Job deleted${n ? ` (with ${n} application${n > 1 ? 's' : ''})` : ''}`,
      data: { removedApplications: n, removedFiles },
    });
  } catch (error) {
    next(error);
  }
};

// Typeahead suggestions (STEP 9) for the jobs search box.
// One `distinct` scan per facet over ACTIVE jobs only; a value is suggested
// when it partially matches the query in that same field. Results are capped
// per facet client-side (MongoDB distinct has no limit option).
const getSuggestions = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const empty = { titles: [], locations: [], skills: [], categories: [] };
    if (q.length < 2) {
      // too short to be meaningful (and avoids matching half the DB on "a")
      return res.status(200).json({ success: true, message: 'Suggestions', data: empty });
    }

    const rx = new RegExp(escapeRegex(q), 'i');
    const base = { status: 'active' };
    const [titles, locations, skills, categories] = await Promise.all([
      Job.distinct('title', { ...base, title: rx }),
      Job.distinct('location', { ...base, location: rx }),
      Job.distinct('skills', { ...base, skills: rx }),
      Job.distinct('category', { ...base, category: rx }),
    ]);

    // NOTE: distinct() on the ARRAY field (skills) returns every distinct
    // value of documents that matched — so we re-test each value here.
    // (Harmless no-op for the string facets.)
    const cap = (arr) =>
      arr
        .filter((v) => typeof v === 'string' && v && rx.test(v))
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 6);
    res.status(200).json({
      success: true,
      message: 'Suggestions fetched successfully',
      data: {
        titles: cap(titles),
        locations: cap(locations),
        skills: cap(skills),
        categories: cap(categories),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public category counts for the landing page tiles (STEP 20).
//          One aggregation over ACTIVE jobs — the hero shows what the board
//          really has, never a marketing number.
// @route   GET /api/jobs/category-counts
const getCategoryCounts = async (req, res, next) => {
  try {
    const rows = await Job.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);
    res.status(200).json({
      success: true,
      message: 'Category counts fetched successfully',
      data: {
        categories: rows
          .filter((r) => r._id)
          .map((r) => ({ name: r._id, count: r.count })),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getJobs, getMyJobs, getJobById, createJob, updateJob, deleteJob, getSuggestions, getCategoryCounts };
