const Job = require('../models/Job');
const User = require('../models/User');

const starterJobs = [
  {
    title: 'Full Stack Developer',
    company: 'TechNova Solutions',
    location: 'Chandigarh',
    salaryMin: 800000,
    salaryMax: 1200000,
    jobType: 'Full Time',
    category: 'Technology',
    experience: 1,
    description: 'Build customer-facing features across our React dashboard and Node API.',
    responsibilities: ['Develop MERN features', 'Write tests', 'Participate in code reviews'],
    requirements: ['React or Node experience', 'Solid JavaScript fundamentals', 'Git'],
    skills: ['React', 'Node.js', 'MongoDB', 'Git'],
    deadline: new Date(Date.now() + 25 * 86400000),
    status: 'active',
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
    description: 'Work with a mentor on real React projects and internal tools.',
    responsibilities: ['Implement React fixes', 'Demo work weekly'],
    requirements: ['Basic React knowledge'],
    skills: ['React', 'JavaScript'],
    deadline: new Date(Date.now() + 30 * 86400000),
    status: 'active',
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
    description: 'Build dashboards and deliver reporting for the growth team.',
    responsibilities: ['Build dashboards', 'Analyse business data'],
    requirements: ['SQL fluency', 'Excel experience'],
    skills: ['SQL', 'Excel', 'PowerBI'],
    deadline: new Date(Date.now() + 20 * 86400000),
    status: 'active',
  },
];

const seedJobsOnStartup = async () => {
  const existingJobs = await Job.exists({});
  if (existingJobs) return;

  let recruiter = await User.findOne({ role: 'recruiter' }).select('_id');
  if (!recruiter) {
    recruiter = await User.create({
      name: 'CareerConnect Recruiter',
      email: process.env.AUTO_SEED_RECRUITER_EMAIL || 'recruiter@careerconnect.local',
      phone: '0000000000',
      password: process.env.AUTO_SEED_RECRUITER_PASSWORD || 'ChangeMe@123',
      role: 'recruiter',
    });
  }

  await Job.insertMany(starterJobs.map((job) => ({ ...job, postedBy: recruiter._id })));
  console.log(`✅ Auto-seeded ${starterJobs.length} starter jobs because no jobs existed.`);
};

module.exports = { seedJobsOnStartup };
