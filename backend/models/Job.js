// CareerConnect — Job model (STEP 7, spec §26)
// status: active (publicly listed) | closed (viewable, no new applications)
//         | draft (visible to the posting recruiter only)
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    salaryMin: { type: Number, default: 0, min: [0, 'Salary cannot be negative'] },
    salaryMax: {
      type: Number,
      default: 0,
      min: [0, 'Salary cannot be negative'],
      validate: {
        validator: function (value) {
          return value >= (this.salaryMin || 0);
        },
        message: 'Maximum salary cannot be less than minimum salary',
      },
    },
    jobType: {
      type: String,
      required: [true, 'Job type is required'],
      enum: {
        values: ['Full Time', 'Part Time', 'Internship', 'Contract', 'Remote'],
        message: 'Invalid job type',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters'],
    },
    experience: {
      type: Number, // years of experience required
      default: 0,
      min: [0, 'Experience cannot be negative'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      maxlength: [10000, 'Description is too long'],
    },
    responsibilities: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Job must have an owner'],
    },
    deadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'closed', 'draft'],
        message: 'Invalid status',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
    versionKey: false, // don't write __v into new documents
    toJSON: { versionKey: false }, // …and never send a legacy one either
  }
);

// Indexes for the listing page's most common queries (spec §49)
jobSchema.index({ status: 1, createdAt: -1 }); // public list: active + newest first
jobSchema.index({ postedBy: 1 }); // recruiter's "my jobs"
jobSchema.index({ jobType: 1, category: 1 }); // filter facets

module.exports = mongoose.model('Job', jobSchema);
