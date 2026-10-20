// CareerConnect — backend entry point
// STEP 13: Express + MongoDB + auth + jobs (+ apply) + applications + users + errors.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB, getDBStatus } = require('./config/db');
const { seedJobsOnStartup } = require('./services/autoSeed');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Middleware ----
app.use(cors()); // Allow requests from the React dev server (Vite)
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));
// NOTE: no express.static for uploads/ on purpose — resumes are PII and are
// only served through GET /api/applications/:id/resume (permission checked).

// ---- Database ----
connectDB()
  .then(async (connection) => {
    if (connection) {
      try {
        await seedJobsOnStartup();
      } catch (error) {
        console.error(`❌ Automatic job seeding failed: ${error.message}`);
      }
    }
  })
  .catch((error) => {
    console.error(`❌ Database startup failed: ${error.message}`);
  });

// ---- Routes ----
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the CareerConnect API 🚀',
    docs: 'See README.md for full API documentation (added in later steps).',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CareerConnect backend is running',
    database: getDBStatus(), // connected | connecting | disconnected
    timestamp: new Date().toISOString(),
  });
});

// Feature routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);

// ---- Error handling (must come after all routes) ----
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 CareerConnect backend running on http://localhost:${PORT}`);
});
