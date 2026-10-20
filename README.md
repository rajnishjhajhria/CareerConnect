# CareerConnect — Find opportunities. Build your career.

> **Status: STEPS 1–21 complete.** Job seekers and recruiters both run end-to-end
> against MongoDB — register → profile → search → save → apply → track, and
> post → manage → review applicants → update pipeline. Step 22 is the final
> verification pass.

A full-stack job portal: React + Vite + Bootstrap 5 on the front,
Express + Mongoose + JWT on the back. No mock data anywhere — every screen
reads and writes the database.

---

## Demo world (created by one command — see Quickstart)

| Role | Email | Password | What you'll see |
|------|-------|----------|-----------------|
| **Job seeker (demo)** | `aarav@careerconnect.com` | `Demo@123` | Profile 100% complete with resume on file · 3 applications (1 shortlisted, 1 under review, 1 rejected — each with the recruiter's note) · 2 saved jobs with applied-status tags |
| **Recruiter (demo)** | `priya@careerconnect.com` | `Demo@123` | 2 postings — “Full Stack Developer” (4 applicants, one per pipeline stage, live funnel) + 1 draft |
| Test seeker | `rita13@test.com` / `sam2@test.com` / `browsecase@test.com` | `Test@123` | Applicants inside priya's funnel (applied / rejected / reviewed) — log in to see the seeker side of status changes |
| Test recruiter | `priya.test@example.com` | `Test@123` | Owns 3 more jobs (ML Engineer, HR Intern, 1 closed Data Analyst) |

Passwords are bcrypt-hashed; the seeder writes them through the real Mongoose
models, so every validator that protects production also protected the seed.

## Tech stack

- **Frontend:** React 19 · Vite 8 · JavaScript (no TypeScript) · Bootstrap 5.3 + Bootstrap Icons · React Router 7 · Axios · Context API — linted with oxlint
- **Backend:** Node · Express 5 · Mongoose 9 · MongoDB 7 · JWT (`jsonwebtoken`) · `bcryptjs` · `multer` for file uploads
- **No UI fakes:** no hardcoded job arrays, no localStorage “sessions” — JWT + Mongo only

## Project structure

```text
careerconnect/
├── backend/
│   ├── config/db.js               # Mongoose connection
│   ├── controllers/               # auth · job · application · user
│   ├── middleware/                # auth(JWT) · roles · uploads · error handling
│   ├── models/                    # User · Job · Application
│   ├── routes/                    # /api/auth /api/jobs /api/applications /api/users
│   ├── scripts/
│   │   ├── seed.js                # demo world builder (--force gated reset)
│   │   └── start-mongo.sh         # idempotent MongoDB bootstrap
│   ├── uploads/                   # applications/ + resumes/ (outside git)
│   ├── .env                       # real values (gitignored) / .env.example (template)
│   └── server.js                  # Express app — /api/health is DB-aware
├── frontend/
│   ├── vite.config.js             # dev proxy /api → :5000 (works on any host)
│   └── src/
│       ├── components/            # 19 reusable pieces (cards, timeline, modals…)
│       ├── context/               # AuthContext — token + user lifecycle
│       ├── pages/                 # 15 routed pages (all live — placeholders retired)
│       ├── services/api.js        # every backend call, typed responses unwrapped
│       └── utils/                 # formatters, status maps, profile completeness
└── README.md
```

## Quickstart

```bash
# 0) one-time: install dependencies            (from careerconnect/)
npm install --prefix backend && npm install --prefix frontend

# 1) MongoDB — if you have your own server (or Atlas), skip to step 2.
#    This sandbox-style setup has a scripted installer instead:
npm run mongo --prefix backend          # downloads & starts mongod on :27017 (skips if up)

# 2) configure + seed
cd backend
cp .env.example .env                    # then set JWT_SECRET to any long random string
node scripts/seed.js                    # builds the demo world (refuses if data exists)
cd ..

# 3) run (two terminals)
npm run dev --prefix backend            # API  → http://localhost:5000
npm run dev --prefix frontend           # site → http://localhost:5173
```

Open **http://localhost:5173** and log in as `priya@careerconnect.com` /
`Demo@123`. The Vite dev server proxies `/api` to the backend, so there is
nothing to configure and no CORS issues in development.

When the backend connects to an empty jobs collection, it automatically creates
three starter jobs. Existing jobs are never replaced. If no recruiter exists,
the startup initializer creates `recruiter@careerconnect.local` with the
password `ChangeMe@123`; set `AUTO_SEED_RECRUITER_EMAIL` and
`AUTO_SEED_RECRUITER_PASSWORD` in `backend/.env` to use different values.

### Rebuilding after an environment reset

Resets can wipe `node_modules` and the local MongoDB (its data lives in
`~/.cache/mongodb` *on purpose* — a live database directory is churn, not
content). The project code and `backend/uploads/` survive; recovery is just:
`npm install` (both folders) → `npm run mongo --prefix backend` →
`node scripts/seed.js` → start the dev servers. Uploads re-link, they are not
regenerated.

## Database setup (choose one)

**A — Local MongoDB:** install Community Server (<https://www.mongodb.com/try/download/community>),
keep `MONGO_URI=mongodb://127.0.0.1:27017/careerconnect` in `backend/.env`.

**B — MongoDB Atlas (free cloud):** create a cluster, allow your IP, then set
`MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/careerconnect`.

Verify either way: `curl http://localhost:5000/api/health` →
`{"success":true,"database":"connected",...}`. The API still serves `/api/health`
while disconnected (reports `"database":"disconnected"`) so you can tell the
two problems apart.

## API reference

All responses share one envelope: `{ success, message, data? }`. Auth is a
`Authorization: Bearer <JWT>` header. Draft jobs answer **404, not 403**, to
outsiders — existence itself is the secret.

**Auth**

| Method | Endpoint | Who | Notes |
|--------|----------|-----|-------|
| POST | `/api/auth/register` | Public | name/email/phone/password/role → 201 + JWT |
| POST | `/api/auth/login` | Public | → 200 + JWT |
| GET | `/api/auth/me` | Any user | fresh user from DB (token check) |

**Jobs**

| Method | Endpoint | Who | Notes |
|--------|----------|-----|-------|
| GET | `/api/jobs` | Public | active jobs; `search, location, jobType, category, experience, salaryMin, skills, sort (newest/salary_high/salary_low/deadline), page, limit` — all combinable |
| GET | `/api/jobs/suggestions` | Public | typeahead over titles/locations/skills/categories |
| GET | `/api/jobs/category-counts` | Public | `{name,count}` per category over active jobs (landing tiles) |
| GET | `/api/jobs/:id` | Public+token | full job, `postedBy` summary, `savedByViewer` for seekers |
| GET | `/api/jobs/mine` | Recruiter | own jobs, any status, `?status=` filter |
| POST | `/api/jobs` | Recruiter | create (publish or draft) → 201 |
| PUT | `/api/jobs/:id` | Owner | partial update; `status` closes/reopens → 200 |
| DELETE | `/api/jobs/:id` | Owner | deletes job + cascades its applications (and their resume files) and saves |
| POST | `/api/jobs/:id/applications` | Seeker | multipart `resume` (≤2 MB, PDF/DOC/DOCX) + `coverLetter` ≤2000 → 201; already applied → 409 |

**Applications**

| Method | Endpoint | Who | Notes |
|--------|----------|-----|-------|
| GET | `/api/applications/my` | Seeker | newest first, job summary populated, `?status=` supported |
| GET | `/api/applications/:id/resume` | Applicant **or** job owner | the only door to the file — no static `/uploads` route |
| GET | `/api/applications/recruiter/summary` | Recruiter | one aggregation: job counts, per-job funnel, recent applicants, new-this-week |
| GET | `/api/applications/job/:jobId` | Job owner | applicant rows w/ contact + skills; `?status=` pipeline filter |
| PUT | `/api/applications/job/:jobId/:applicationId/status` | Job owner | `{status, note?}` → seeker sees it instantly; first real action stamps `reviewedAt` |

**Profile (users)**

| Method | Endpoint | Who | Notes |
|--------|----------|-----|-------|
| GET / PUT | `/api/users/me` | Any user | PUT is whitelisted (email immutable); skills dedupe & cap at 20 |
| GET | `/api/users/me/saved` | Seeker | saved jobs, newest first, tagged with `applicationStatus` |
| PUT | `/api/users/me/saved/:jobId` | Seeker | toggle → `{saved, savedCount}` |
| POST / GET / DELETE | `/api/users/me/resume` | Any user | upload-replace (old file unlinked) / download / remove |

```bash
# quick look at the public board
curl 'http://localhost:5000/api/jobs?search=react&sort=salary_high&limit=5'
```

## Frontend routes

| Route | Access | Page |
|-------|--------|------|
| `/` | Public | Home — live category tiles + latest jobs |
| `/jobs` | Public | Search, filters (URL-backed), sort, pagination, save toggles |
| `/jobs/:id` | Public | Details, apply modal (resume + cover letter), save button |
| `/login`, `/register` | Public | JWT auth, role-aware redirect |
| `/dashboard` | Seeker | Profile-strength dashboard |
| `/applications` | Seeker | Tracker: timeline, recruiter notes, resume re-download |
| `/saved-jobs` | Seeker | Saved list with applied-status tags |
| `/profile` | Seeker | Edit profile, skills, resume lifecycle, completeness meter |
| `/recruiter/dashboard` | Recruiter | Funnel stats + recent applicants |
| `/recruiter/jobs` | Recruiter | Manage postings (status flow, edit, delete) |
| `/recruiter/jobs/create` · `.../:id/edit` | Recruiter | Full job form (draft or publish) |
| `/recruiter/jobs/:jobId/applicants` | Recruiter | Pipeline: résumé download, cover letter, status + note updates |
| anything else | Public | 404 |

## Data models (one paragraph each)

- **User** — auth fields (bcrypt-hashed password, never returned) + profile fields (title, about, skills, education, experience, links) + `resume` metadata + `savedJobs: [ObjectId]`. Email is unique & immutable.
- **Job** — posting fields + `status: draft|active|closed`, `deadline`, `skills[]`, `postedBy`. Indexes back the filter facets; deleting cascades.
- **Application** — one per `(job, applicant)` enforced by a **unique index** (double-submit race → the loser gets 409). `status` pipeline `applied → reviewed → shortlisted → hired|rejected`, `statusNote` for the applicant, `reviewedAt`, cover letter, and resume *metadata* only (the file lives under `uploads/applications/` with a generated name).

## Security & design notes (viva cheat-sheet)

- JWT (7-day expiry) signed with `JWT_SECRET`; routes guard with `protect` + `authorize('role')`.
- Uploads: Multer with an extension↔MIME whitelist, 2 MB cap, random disk names; rejected/orphaned files are unlinked. **Nothing under `uploads/` is ever served statically** — downloads go through permission-checked routes.
- Draft jobs 404 to non-owners everywhere (details, search, save toggle, applications).
- Writes are whitelisted (`$set` of known fields only); `req.user` from the token is the only authority for ownership — body-supplied ids are ignored.
- Resume replacement = write new → update DB → unlink old (never lose the working file first).

## Scripts

| Where | Command | Does |
|-------|---------|------|
| `backend/` | `npm run dev` / `npm start` | API with hot reload / plain |
| `backend/` | `npm run mongo` | idempotent MongoDB bootstrap for this sandbox |
| `backend/` | `npm run seed` | demo data (guard refuses on non-empty; add `--force` to reset) |
| `frontend/` | `npm run dev` / `npm run build` / `npm run preview` | dev server / production build / serve build |
| `frontend/` | `npm run lint` | oxlint over the whole `src/` |

## Environment variables (`backend/.env`, template in `.env.example`)

| Key | Purpose |
|-----|---------|
| `PORT` | API port (default 5000) |
| `MONGO_URI` | connection string — the only place the DB is configured |
| `JWT_SECRET` | signing key — any long random string; never commit |
| `JWT_EXPIRE` | token lifetime (default `7d`) |

CORS is left open (`app.use(cors())`) on purpose: in dev the browser only ever
talks to the Vite proxy (same origin), and open CORS keeps `curl :5000` testing
from any host painless. For a production deploy, restrict the origin there.

## Manual test checklist (Step 22 will run this end-to-end)

1. **Seeker journey** — register fresh → profile to 100% + upload resume → search “React” → save a job → see ♥ state across pages → apply with resume + cover letter → tracker shows *applied*.
2. **Recruiter journey** — log in as priya → dashboard funnel numbers match → open *Full Stack Developer* applicants → download a résumé → read cover letter → move Rita from “applied” to “reviewed” with a note.
3. **Loop closes** — log in as `rita13@test.com` → her Applications page shows *Under review* with the exact note.
4. **Guards** — open a second recruiter (`priya.test@example.com`): priya's applicants URL must 404; a seeker token must 403 on any recruiter route; re-apply to the same job → 409.
5. `npm run seed` on a dirty DB refuses; `--force` rebuilds the exact table above.
