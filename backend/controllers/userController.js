// CareerConnect — current-user profile APIs (STEP 13, spec §28; saved jobs + resume STEP 18)
// GET    /api/users/me          → my profile
// PUT    /api/users/me          → update profile (whitelist; model validators final say)
// PUT    /api/users/me/saved/:jobId → toggle a saved job   (jobseeker)
// GET    /api/users/me/saved    → saved jobs, with applied-status awareness (jobseeker)
// POST   /api/users/me/resume   → upload profile resume (multipart 'resume')
// GET    /api/users/me/resume   → download my resume
// DELETE /api/users/me/resume   → remove my resume
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { PROFILE_UPLOAD_DIR } = require('../middleware/uploadMiddleware');

const PHONE_REGEX = /^[+()\-\s0-9]{8,15}$/;
const SKILL_MAX = 20;

// Skills arrive from a client that could send anything: keep only non-empty
// strings, collapse inner whitespace, drop case-insensitive duplicates, cap 20.
const normalizeSkills = (value) => {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(',');
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const skill = item.trim().replace(/\s+/g, ' ');
    if (!skill) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
    if (out.length >= SKILL_MAX) break;
  }
  return out;
};

// @desc    Get my profile
// @route   GET /api/users/me   (protected)
const getMyProfile = async (req, res, next) => {
  try {
    // req.user comes from protect (fresh from DB); re-read so we never serve
    // a stale snapshot if another tab updated the profile a second ago.
    const fresh = await User.findById(req.user._id);
    res.status(200).json({ success: true, message: 'Profile fetched', data: { user: fresh } });
  } catch (error) {
    next(error);
  }
};

// @desc    Update my profile
// @route   PUT /api/users/me   (protected)
const updateMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account no longer exists' });
    }

    const { name, phone, location, professionalTitle, about, skills, education, experience } =
      req.body;

    // email is deliberately NOT editable here (it IS the login identity).
    if (name !== undefined) {
      const v = String(name).trim();
      if (!v) return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      if (v.length > 100)
        return res.status(400).json({ success: false, message: 'Name cannot exceed 100 characters' });
      user.name = v;
    }

    if (phone !== undefined) {
      const v = String(phone).trim();
      if (!PHONE_REGEX.test(v)) {
        return res.status(400).json({
          success: false,
          message: 'Enter a valid phone number (8–15 digits; +, -, spaces allowed)',
        });
      }
      user.phone = v;
    }

    if (location !== undefined) user.location = String(location).trim().slice(0, 80);
    if (professionalTitle !== undefined)
      user.professionalTitle = String(professionalTitle).trim().slice(0, 100);
    if (about !== undefined) user.about = String(about).trim();

    if (skills !== undefined) user.skills = normalizeSkills(skills);

    if (education !== undefined && education !== null) {
      const e = typeof education === 'object' ? education : {};
      user.education.degree = String(e.degree ?? '').trim().slice(0, 100);
      user.education.university = String(e.university ?? '').trim().slice(0, 120);
      user.education.cgpa = String(e.cgpa ?? '').trim().slice(0, 8);
      const yearStr = e.graduationYear === null || e.graduationYear === undefined ? '' : String(e.graduationYear).trim();
      if (yearStr === '') {
        user.education.graduationYear = undefined; // clear
      } else {
        const y = Number(yearStr);
        const max = new Date().getFullYear() + 8;
        if (!Number.isInteger(y) || y < 1960 || y > max) {
          return res.status(400).json({
            success: false,
            message: `Graduation year must be a whole number between 1960 and ${max}`,
          });
        }
        user.education.graduationYear = y;
      }
    }

    if (experience !== undefined && experience !== null) {
      const ex = typeof experience === 'object' ? experience : {};
      const years = Number(ex.years ?? 0);
      if (!Number.isFinite(years) || years < 0 || years > 60) {
        return res.status(400).json({
          success: false,
          message: 'Experience years must be a number between 0 and 60',
        });
      }
      user.experience.years = years;
      user.experience.currentCompany = String(ex.currentCompany ?? '').trim().slice(0, 100);
    }

    await user.save(); // final authority: model validators (lengths, types)

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save/un-save a job (one endpoint, toggles — the client never has to
//          know the current state to flip it correctly; the response says what happened)
// @route   PUT /api/users/me/saved/:jobId   (jobseeker)
const toggleSavedJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId).select('_id status');
    // Drafts 404 like everywhere else — saving must not leak a draft's existence.
    if (!job || job.status === 'draft') {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const user = await User.findById(req.user._id);
    const wasSaved = user.savedJobs.some((id) => id.equals(job._id));
    if (wasSaved) user.savedJobs.pull(job._id);
    else user.savedJobs.push(job._id);
    await user.save();

    res.status(200).json({
      success: true,
      message: wasSaved ? 'Job removed from saved list' : 'Job saved for later',
      data: { saved: !wasSaved, savedCount: user.savedJobs.length },
    });
  } catch (error) {
    next(error); // malformed id → CastError → 404 via errorMiddleware
  }
};

// @desc    My saved jobs, newest-saved first, each annotated with the
//          application status if the seeker already applied (the details-page
//          "Applied" pill logic, served in one round-trip for the whole list).
// @route   GET /api/users/me/saved   (jobseeker)
const getSavedJobs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const ids = [...user.savedJobs].reverse(); // push order = save order → newest first
    if (ids.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No saved jobs yet',
        data: { jobs: [] },
      });
    }

    // $ne draft: a job re-set to draft after being saved disappears the same
    // way it disappeared from the public board.
    const found = await Job.find({ _id: { $in: ids }, status: { $ne: 'draft' } });
    const ordered = ids.map((id) => found.find((j) => j._id.equals(id))).filter(Boolean);

    // Self-heal: references to deleted / re-drafted jobs are dropped now,
    // so the array cannot accumulate corpses even if a cascade is added later.
    const missing = ids.filter((id) => !found.some((j) => j._id.equals(id)));
    if (missing.length > 0) {
      await User.updateOne({ _id: user._id }, { $pull: { savedJobs: { $in: missing } } });
    }

    const statusByJob = {};
    if (found.length > 0) {
      const applications = await Application.find({
        applicant: user._id,
        job: { $in: found.map((j) => j._id) },
      })
        .select('job status')
        .lean();
      applications.forEach((a) => {
        statusByJob[a.job.toString()] = a.status;
      });
    }

    const jobs = ordered.map((j) => ({
      ...j.toJSON(),
      applicationStatus: statusByJob[j._id.toString()] || null,
    }));
    res.status(200).json({
      success: true,
      message: 'Saved jobs fetched successfully',
      data: { jobs },
    });
  } catch (error) {
    next(error);
  }
};

// ---- profile resume (STEP 18) ----
// Same file rules as application resumes (shared Multer config), separate
// bucket folder, owner-only access. ONE file per account: a new upload
// replaces the old one and the old disk file is removed.

// @desc    Upload (or replace) my resume — Multer already stored req.file
// @route   POST /api/users/me/resume   (protected, multipart 'resume')
const uploadMyResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'A resume file is required (PDF or Word, max 2 MB)' });
    }
    const user = await User.findById(req.user._id);
    const previous = user.resume.filePath; // remove the replaced file only AFTER the new save
    user.resume.fileName = req.file.originalname; // shown in the UI + download header
    user.resume.filePath = req.file.filename; // generated disk name — never user input
    user.resume.uploadedAt = new Date();
    await user.save();

    if (previous) {
      fs.promises.unlink(path.join(PROFILE_UPLOAD_DIR, previous)).catch(() => {});
    }
    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download my resume (no static /uploads mount — this is the only door)
// @route   GET /api/users/me/resume   (protected)
const downloadMyResume = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.resume.filePath) {
      return res.status(404).json({ success: false, message: 'You have not uploaded a resume yet' });
    }
    const abs = path.join(PROFILE_UPLOAD_DIR, user.resume.filePath);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ success: false, message: 'Resume file is missing on this server' });
    }
    const safeName = String(user.resume.fileName || 'resume').replace(/["\r\n]/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.sendFile(abs);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove my resume (DB fields + disk file)
// @route   DELETE /api/users/me/resume   (protected)
const removeMyResume = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.resume.filePath) {
      const disk = user.resume.filePath;
      user.resume.fileName = '';
      user.resume.filePath = '';
      user.resume.uploadedAt = undefined;
      await user.save();
      // best-effort like everywhere else: DB is already consistent
      fs.promises.unlink(path.join(PROFILE_UPLOAD_DIR, disk)).catch(() => {});
      return res.status(200).json({ success: true, message: 'Resume removed', data: { user } });
    }
    res.status(200).json({ success: true, message: 'No resume to remove', data: { user } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  toggleSavedJob,
  getSavedJobs,
  uploadMyResume,
  downloadMyResume,
  removeMyResume,
};
