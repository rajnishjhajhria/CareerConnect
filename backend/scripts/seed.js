// CareerConnect — demo data seeder (STEP 21).
// Rebuilds a consistent demo world so both dashboards light up with real,
// cross-linked data. Run from the backend/ folder:
//   node scripts/seed.js          → only seeds an EMPTY database (safety guard)
//   node scripts/seed.js --force  → reset: replaces users/jobs/applications
//   • 2 demo accounts (README) + 3 test seekers + 1 test recruiter
//   • 5 jobs across 3 statuses (2 draft-free active per recruiter, 1 draft, 1 closed)
//   • 6 applications spread over every pipeline stage → both dashboards light up
//   • resumes point at REAL files already in uploads/applications (if present),
//     so the download buttons keep working after a seed.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { UPLOAD_DIR, PROFILE_UPLOAD_DIR } = require('../middleware/uploadMiddleware');

const daysFromNow = (n) => new Date(Date.now() + n * 86400000);

const pickResumeFiles = () => {
  const dir = UPLOAD_DIR;
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(pdf|docx?|doc)$/i.test(f)) : [];
  if (files.length === 0) {
    // fresh machine with no uploads yet → fabricate a tiny valid-looking PDF
    const fake = path.join(dir, 'seed-resume.pdf');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      fake,
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'
    );
    return ['seed-resume.pdf'];
  }
  return files;
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected — seeding', mongoose.connection.name);

  // Guard: never wipe real data by accident. Re-seeding is a RESET — opt in with --force.
  const existing = await User.estimatedDocumentCount();
  if (existing > 0 && !process.argv.includes('--force')) {
    console.log(`Database already has ${existing} user(s) — leaving it alone.`);
    console.log('Want the demo world reset?  node scripts/seed.js --force');
    await mongoose.disconnect();
    return;
  }

  await Promise.all([
    User.deleteMany({}),
    Job.deleteMany({}),
    Application.deleteMany({}),
  ]);

  // ---- users (passwords hashed by the model's pre-save hook) ----
  const [aarav, priya, rita, sam, browse, priyaTest] = await User.create([
    {
      name: 'Aarav Sharma',
      email: 'aarav@careerconnect.com',
      phone: '9876543210',
      password: 'Demo@123',
      role: 'jobseeker',
      location: 'Mohali',
      professionalTitle: 'Frontend Developer (React)',
      about:
        'Final-year CSE student who has shipped three MERN projects, including a campus placement tracker used by 200+ students. Looking for a full-stack role where I can grow from React into Node and MongoDB.',
      skills: ['React', 'JavaScript', 'Node.js', 'MongoDB', 'Git'],
      education: {
        degree: 'B.Tech Computer Science',
        university: 'Chandigarh University',
        graduationYear: 2026,
        cgpa: '8.4',
      },
      experience: { years: 1, currentCompany: 'Pixelbyte Labs (intern)' },
    },
    {
      name: 'Priya Sharma',
      email: 'priya@careerconnect.com',
      phone: '9812345670',
      password: 'Demo@123',
      role: 'recruiter',
      location: 'Chandigarh',
      professionalTitle: 'HR Lead @ TechNova Solutions',
      about: 'Hiring engineers who love clean code and honest communication.',
      skills: ['Team Leading', 'Technical Recruitment'],
    },
    {
      name: 'Rita S',
      email: 'rita13@test.com',
      phone: '9800000013',
      password: 'Test@123',
      role: 'jobseeker',
      location: 'Panchkula',
      professionalTitle: 'Data Analyst',
      about: 'SQL and PowerBI focused analyst with two internships in retail analytics.',
      skills: ['SQL', 'Python', 'Excel', 'PowerBI'],
      education: { degree: 'B.Sc Statistics', university: 'PU Chandigarh', graduationYear: 2027, cgpa: '9.0' },
    },
    {
      name: 'Sam Seeker',
      email: 'sam2@test.com',
      phone: '9800000022',
      password: 'Test@123',
      role: 'jobseeker',
      location: 'Ludhiana',
      skills: ['Java', 'Spring Boot'],
    },
    {
      name: 'Test User',
      email: 'browsecase@test.com',
      phone: '9800000033',
      password: 'Test@123',
      role: 'jobseeker',
      location: 'Chandigarh',
      skills: ['React', 'TypeScript'],
    },
    {
      name: 'Priya Test',
      email: 'priya.test@example.com',
      phone: '9812345671',
      password: 'Test@123',
      role: 'recruiter',
      location: 'Mohali',
      professionalTitle: 'Talent Partner @ DataMinds & SkillSphere',
    },
  ]);

  // ---- jobs ----
  const [fullStack, reactIntern, mlEngineer, hrIntern, dataAnalyst] = await Job.create([
    {
      title: 'Full Stack Developer',
      company: 'TechNova Solutions',
      location: 'Chandigarh',
      salaryMin: 800000,
      salaryMax: 1200000,
      jobType: 'Full Time',
      category: 'Technology',
      experience: 1,
      description:
        'Build customer-facing features across our React dashboard and Node/Express API alongside a small, senior team. You will own features end to end — schema, API, UI — with code review from two staff engineers and direct exposure to product decisions.',
      responsibilities: ['Develop and maintain MERN features', 'Write unit tests for your PRs', 'Participate in code reviews'],
      requirements: ['1+ year with React or Node', 'Solid JavaScript fundamentals', 'Comfortable with Git'],
      skills: ['React', 'Node.js', 'MongoDB', 'Express', 'Git'],
      deadline: daysFromNow(25),
      status: 'active',
      postedBy: priya._id,
    },
    {
      title: 'React Developer Intern',
      company: 'TechNova Solutions',
      location: 'Chandigarh (Hybrid)',
      salaryMin: 25000,
      salaryMax: 35000,
      jobType: 'Internship',
      category: 'Technology',
      experience: 0,
      description:
        'Three-month paid internship on our internal tools team, with a real project and a mentor from day one. (Still drafting the final scope — hence this is kept as a demo draft.)',
      responsibilities: ['Small React fixes', 'Weekly demo to the team'],
      requirements: ['Basic React knowledge'],
      skills: ['React', 'JavaScript'],
      deadline: daysFromNow(30),
      status: 'draft',
      postedBy: priya._id,
    },
    {
      title: 'Machine Learning Engineer',
      company: 'DataMinds AI',
      location: 'Mohali',
      salaryMin: 1500000,
      salaryMax: 2400000,
      jobType: 'Full Time',
      category: 'Data Science',
      experience: 2,
      description:
        'Take models from notebook to production: training pipelines, feature stores, and serving latency budgets. We ship weekly and measure everything.',
      responsibilities: ['Own model deployment pipelines', 'Monitor drift and latency'],
      requirements: ['Python + one framework (PyTorch/TF)', '2+ years in production ML'],
      skills: ['Python', 'PyTorch', 'MLOps', 'SQL'],
      deadline: daysFromNow(18),
      status: 'active',
      postedBy: priyaTest._id,
    },
    {
      title: 'HR Intern',
      company: 'SkillSphere Academy',
      location: 'Remote',
      salaryMin: 15000,
      salaryMax: 20000,
      jobType: 'Internship',
      category: 'HR',
      experience: 0,
      description:
        'Support the two-person HR team with onboarding, interview scheduling and people-analytics spreadsheets. Great first step into tech HR.',
      responsibilities: ['Coordinate interviews', 'Maintain onboarding checklists'],
      requirements: ['Good written communication', 'Excel basics'],
      skills: ['Communication', 'Excel'],
      deadline: daysFromNow(12),
      status: 'active',
      postedBy: priyaTest._id,
    },
    {
      title: 'Data Analyst',
      company: 'DataMinds AI',
      location: 'Mohali',
      salaryMin: 600000,
      salaryMax: 900000,
      jobType: 'Full Time',
      category: 'Data Science',
      experience: 1,
      description: 'Reporting and ad-hoc analysis for the growth team. Filled — kept here so the board shows a realistic closed job.',
      responsibilities: ['Build dashboards'],
      requirements: ['SQL fluency'],
      skills: ['SQL', 'Excel', 'PowerBI'],
      deadline: daysFromNow(-6),
      status: 'closed',
      postedBy: priyaTest._id,
    },
  ]);

  // ---- applications (every pipeline stage represented) ----
  const resumeFiles = pickResumeFiles();
  let fileCursor = 0;
  const nextResume = () => {
    const filename = resumeFiles[fileCursor % resumeFiles.length];
    fileCursor += 1;
    const abs = path.join(UPLOAD_DIR, filename);
    return {
      filename,
      originalName: 'resume.pdf',
      mimeType: 'application/pdf',
      size: fs.existsSync(abs) ? fs.statSync(abs).size : 58,
    };
  };

  await Application.create([
    // priya@careerconnect.com's Full Stack funnel — 4 applicants, 4 stages
    { job: fullStack._id, applicant: aarav._id, status: 'shortlisted',
      coverLetter: 'Three shipped MERN projects and a placement tracker used across campus — I would love to go deep on code review with your team.', resume: nextResume() },
    { job: fullStack._id, applicant: browse._id, status: 'reviewed', reviewedAt: daysFromNow(-3),
      coverLetter: 'Demo pipeline applicant (browsecase@test.com).', resume: nextResume() },
    { job: fullStack._id, applicant: sam._id, status: 'rejected',
      coverLetter: 'Demo pipeline applicant (sam2@test.com).', resume: nextResume() },
    { job: fullStack._id, applicant: rita._id, status: 'applied',
      coverLetter: 'Demo pipeline applicant (rita13@test.com).', resume: nextResume() },
    // priya.test's jobs — the timeline data Step 17 seeded by hand, now first-class
    { job: hrIntern._id, applicant: aarav._id, status: 'reviewed', reviewedAt: daysFromNow(-2),
      statusNote: 'Profile looks promising — moving to shortlist review next week.',
      coverLetter: 'Organised two campus hiring drives; I would bring the same checklists and care to SkillSphere.', resume: nextResume() },
    { job: mlEngineer._id, applicant: aarav._id, status: 'rejected',
      statusNote: 'Strong profile, but we chose a candidate with more production ML experience.',
      coverLetter: 'Self-taught Python and two deployed models — happy to walk through either.', resume: nextResume() },
  ]);

  // ---- profile resume + saved jobs for the seeker demo ----
  const profileFiles = fs.existsSync(PROFILE_UPLOAD_DIR)
    ? fs.readdirSync(PROFILE_UPLOAD_DIR).filter((f) => /\.(pdf|docx?)$/i.test(f))
    : [];
  const profileResume = profileFiles[0];
  await User.updateOne(
    { _id: aarav._id },
    {
      $set: {
        resume: profileResume
          ? { fileName: 'resume.pdf', filePath: profileResume, uploadedAt: daysFromNow(-1) }
          : { fileName: '', filePath: '', uploadedAt: undefined },
        savedJobs: [fullStack._id, mlEngineer._id], // save order: Full Stack, then ML
      },
    }
  );

  const [u, j, a] = await Promise.all([User.countDocuments(), Job.countDocuments(), Application.countDocuments()]);
  console.log(`Seeded: ${u} users · ${j} jobs (${j === 5 ? 'incl 1 draft, 1 closed' : '?'}) · ${a} applications`);
  console.log('Demo logins → aarav@careerconnect.com / Demo@123  ·  priya@careerconnect.com / Demo@123');
  await mongoose.disconnect();
})().catch((err) => {
  console.error('SEED FAILED:', err.message);
  process.exit(1);
});
