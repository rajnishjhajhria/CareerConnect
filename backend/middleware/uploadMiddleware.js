// CareerConnect — resume uploads via Multer (STEP 11; profile resumes STEP 18)
// Design notes:
//  • Files land in backend/uploads/<bucket> under a GENERATED name
//    (timestamp + random hex + trusted extension) — user-supplied names never
//    touch the filesystem, so path traversal and collisions are impossible.
//  • Both the declared MIME type and the extension must agree, and the type
//    must be one of PDF/DOC/DOCX. Same rules for every resume kind.
//  • No express.static mount for these folders: downloads go through
//    permission-checked API routes (application: applicant + job recruiter;
//    profile: owner only).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const UPLOAD_DIR = path.join(UPLOADS_ROOT, 'applications'); // application attachments
const PROFILE_UPLOAD_DIR = path.join(UPLOADS_ROOT, 'resumes'); // "my resume" on the profile

fs.mkdirSync(UPLOAD_DIR, { recursive: true }); // create at boot → no first-upload race
fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED = {
  // declared MIME type → the extension we insist on
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

// One factory, two buckets — identical rules, different destination.
const makeUploader = (destDir) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  });
  return multer({
    storage,
    limits: { fileSize: MAX_BYTES },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const ok = ALLOWED[file.mimetype] && ALLOWED[file.mimetype] === ext;
      if (ok) return cb(null, true);
      const err = new Error('Only PDF, DOC and DOCX resumes are allowed');
      err.statusCode = 400;
      return cb(err);
    },
  });
};

const applicationUploader = makeUploader(UPLOAD_DIR);
const profileUploader = makeUploader(PROFILE_UPLOAD_DIR);

// Wraps .single() so Multer's own errors (oversize file, missing field, …)
// become clean 400 JSON, and a file already streamed to disk when the request
// was rejected (e.g. LIMIT_FILE_SIZE) is never orphaned.
const wrapUpload = (uploader) => (req, res, next) => {
  uploader.single('resume')(req, res, (err) => {
    if (!err) return next();
    if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
    const message =
      err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? 'Resume must be 2 MB or smaller'
        : err.message || 'Upload failed';
    return res.status(err.statusCode || 400).json({ success: false, message });
  });
};

const uploadResume = wrapUpload(applicationUploader); // application attachments
const uploadProfileResume = wrapUpload(profileUploader); // profile "my resume"

module.exports = {
  uploadResume,
  uploadProfileResume,
  UPLOAD_DIR,
  PROFILE_UPLOAD_DIR,
};
