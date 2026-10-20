// CareerConnect — Application model (STEP 11, spec §27)
// One document per (job, job seeker). The pipeline status is updated later by
// the recruiter (Steps 15/19); the resume itself lives on disk and only the
// metadata is stored here.
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Status pipeline (recruiter advances it in Step 19):
    //   applied → reviewed → shortlisted → hired | rejected
    status: {
      type: String,
      enum: ['applied', 'reviewed', 'shortlisted', 'hired', 'rejected'],
      default: 'applied',
    },
    statusNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Status note cannot exceed 500 characters'],
      default: '',
    },
    reviewedAt: { type: Date, default: null },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [2000, 'Cover letter cannot exceed 2000 characters'],
    },
    // Resume metadata only — bytes live under uploads/applications/ with a
    // generated filename, served through a permission-checked route.
    resume: {
      filename: { type: String, required: true }, // on-disk name (Date-now-hash.ext)
      originalName: { type: String, required: true }, // shown in UI + download header
      mimeType: { type: String },
      size: { type: Number },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { versionKey: false },
  }
);

// Apply-once: the UNIQUE index is the real guard — two simultaneous requests
// from two tabs still end with one document (the loser gets E11000 → 409).
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ applicant: 1, createdAt: -1 }); // "My Applications"
applicationSchema.index({ job: 1, status: 1 }); // recruiter pipeline (Step 19)

module.exports = mongoose.model('Application', applicationSchema);
