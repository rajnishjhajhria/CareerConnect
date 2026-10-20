// CareerConnect — User model (STEP 3)
// One collection for both roles (jobseeker + recruiter), told apart by `role`.
// Auth (STEP 3) only needs name/email/phone/password/role; the profile fields
// below (location, skills, education, ...) are filled in from STEP 13 onwards.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, trim: true, default: '', maxlength: [100, 'Degree is too long'] },
    university: { type: String, trim: true, default: '', maxlength: [120, 'University name is too long'] },
    graduationYear: { type: Number },
    cgpa: { type: String, trim: true, default: '', maxlength: [8, 'CGPA looks too long'] },
  },
  { _id: false } // embedded sub-document, no own _id needed
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true, // creates a unique index; duplicates rejected by MongoDB
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
      trim: true,
    },
    // select:false → password is NEVER returned by queries unless explicitly
    // requested with .select('+password') (used only inside login).
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    role: {
      type: String,
      required: [true, 'Please specify a role'],
      enum: {
        values: ['jobseeker', 'recruiter'],
        message: "Role must be either 'jobseeker' or 'recruiter'",
      },
    },
    profilePhoto: { type: String, default: '' },
    location: { type: String, trim: true, default: '', maxlength: [80, 'Location is too long'] },
    professionalTitle: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Title is too long'],
    },
    about: { type: String, trim: true, default: '', maxlength: [2000, 'About me is too long'] },
    skills: {
      type: [{ type: String, trim: true, maxlength: [40, 'A skill name is too long'] }],
      default: [],
    },
    education: { type: educationSchema, default: () => ({}) },
    experience: {
      years: { type: Number, default: 0, min: [0, 'Experience cannot be negative'] },
      currentCompany: { type: String, trim: true, default: '' },
    },
    resume: {
      fileName: { type: String, default: '' }, // original upload name (shown in UI)
      filePath: { type: String, default: '' }, // disk name inside uploads/resumes/ — generated, never user input
      uploadedAt: { type: Date },
    },
    // Saved jobs (STEP 18): plain array of Job ids in save order — newest
    // saved is displayed first by reversing on read. No join collection
    // needed at this scale, and a recruiter deleting a job cascade-pulls the
    // id (see deleteJob), so the array can't rot.
    savedJobs: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false, // don't write __v into new documents
    toJSON: { versionKey: false }, // …and never send a legacy one either
  }
);

// Hash the password before saving — but only when it was added/changed,
// so updating a profile later doesn't re-hash the existing hash.
// NOTE: an async pre-hook must NOT declare `next` — Mongoose treats async
// hooks as promise-based, so `next` would be undefined ("next is not a function").
// Just return (or throw to abort the save).
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare a plain-text password with the stored hash (used at login)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Create a JWT containing { userId, role } (spec §23)
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ userId: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

module.exports = mongoose.model('User', userSchema);
