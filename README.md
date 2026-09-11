# NexIndia — Civic Issue Reporting & Resolution Platform

> **Smart India Hackathon Project** — Crowdsourced Civic Issue Reporting and Resolution System

A production-ready full-stack civic issue reporting platform where citizens report potholes, garbage, broken streetlights, water leakage and other civic issues. Authorities triage, prioritize, and resolve them — with AI classification, duplicate clustering, SLA-breach auto-escalation, and citizen-verified resolution.

---

## Problem Statement

Municipal corporations receive thousands of civic complaints via phone, apps, and in-person. Issues are:
- Duplicated across channels (same pothole reported 15 times)
- Under-prioritized (no data-driven scoring)
- Never escalated (overdue issues rot unattended)
- "Resolved" without evidence (no proof required)
- Untrusted (citizens have no way to verify or reject resolutions)

NexIndia solves all five problems with a single integrated platform.

---

## Key Differentiators

| Feature | Description |
|---------|-------------|
| 🤖 AI Auto-Triage | MobileNet-based image embedding + keyword classifier assigns civic categories automatically |
| 🔍 Duplicate Clustering | 40% geo + 35% image similarity + 15% category + 10% time — cosine similarity on embeddings |
| 📊 Priority Scoring | Deterministic formula: base score + report bonus + SLA proximity |
| ⏱️ SLA Auto-Escalation | Cron job escalates overdue issues through Officer → Department → Municipal → Commissioner |
| ✅ Resolution Verification | Citizens must accept or reject resolution proof before issue closes |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas + Mongoose |
| Authentication | JWT + bcrypt |
| Maps | Leaflet + OpenStreetMap |
| Image Storage | Cloudinary |
| AI | TensorFlow.js / MobileNet (demo: keyword classifier) |
| Charts | Recharts |
| Scheduling | node-cron |

---

## Architecture

```
Citizen → React/Vite/Tailwind → JWT → Express.js
                                         ↓
                              ┌──────────────────────┐
                              │       SERVICES        │
                              │ AI Classification     │
                              │ Duplicate Detection   │
                              │ Priority Engine       │
                              │ SLA Engine            │
                              │ Escalation Engine     │
                              │ Resolution Verify     │
                              └──────────────────────┘
                                    ↓          ↓
                              MongoDB Atlas  Cloudinary
                                    ↓
                              Leaflet + OpenStreetMap
                                    ↓
                              Authority Dashboard
                                    ↓
                              Citizen Verification
                                    ↓
                              RESOLVED / REWORK REQUIRED
```

---

## Folder Structure

```
civic-issue-platform/
├── client/                        # React + Vite frontend
│   └── src/
│       ├── components/            # Shared UI components
│       │   ├── Badges.jsx         # Priority, Status, Category badges
│       │   ├── IssueMap.jsx       # Leaflet map component
│       │   ├── NotificationBell.jsx
│       │   └── UI.jsx             # Cards, loaders, alerts
│       ├── context/
│       │   └── AuthContext.jsx    # JWT auth context
│       ├── layouts/               # Role-based layouts
│       │   ├── CitizenLayout.jsx
│       │   ├── AuthorityLayout.jsx
│       │   └── AdminLayout.jsx
│       ├── pages/
│       │   ├── Landing.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── citizen/           # 5 citizen pages
│       │   ├── authority/         # 5 authority pages
│       │   └── admin/             # 5 admin pages
│       ├── services/
│       │   ├── api.js             # Axios client
│       │   └── index.js           # All API service functions
│       └── utils/index.js         # Constants, formatters
│
├── server/
│   └── src/
│       ├── controllers/           # Request handlers
│       │   ├── authController.js
│       │   ├── issueController.js
│       │   ├── reportController.js
│       │   ├── escalationController.js
│       │   ├── departmentController.js
│       │   ├── notificationController.js
│       │   ├── adminController.js
│       │   ├── demoController.js
│       │   └── aiController.js
│       ├── middleware/
│       │   ├── auth.js            # JWT + role authorization
│       │   ├── errorHandler.js    # Centralized error handler
│       │   └── upload.js          # Multer (memory → Cloudinary)
│       ├── models/                # Mongoose schemas
│       │   ├── User.js
│       │   ├── Issue.js
│       │   ├── Report.js
│       │   ├── Department.js
│       │   ├── Escalation.js
│       │   └── Notification.js
│       ├── routes/                # Express route definitions
│       ├── services/              # Business logic
│       │   ├── aiService.js       # Classification + embeddings
│       │   ├── duplicateService.js # Multi-signal clustering
│       │   ├── priorityService.js  # Deterministic scoring
│       │   ├── slaService.js       # Deadline + aging
│       │   ├── escalationService.js # Auto-escalation cron
│       │   ├── cloudinaryService.js
│       │   └── notificationService.js
│       └── server.js
│
├── scripts/
│   └── seed.js                   # Demo data seeder
├── postman/
│   └── civic-platform.postman_collection.json
├── .env.example
├── .gitignore
└── README.md
```

---

## MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free cluster
2. Create a database user with read/write access
3. Whitelist your IP address (or use `0.0.0.0/0` for development)
4. Get the connection string: `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/civic-platform`
5. Paste it in your `.env` as `MONGODB_URI`

---

## Cloudinary Setup

1. Sign up at [cloudinary.com](https://cloudinary.com) (free tier is sufficient)
2. From the dashboard, copy:
   - Cloud Name
   - API Key
   - API Secret
3. Add them to your `.env`

---

## Environment Variables

Copy `.env.example` to `.env` in the project root and fill in values:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/civic-platform

JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret

DUPLICATE_THRESHOLD=0.75
DUPLICATE_RADIUS_METERS=100

AI_DEMO_MODE=true
DEMO_MODE=true

CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

> **Security:** Never commit `.env` to git. The `.gitignore` already excludes it.

---

## Installation

### Prerequisites
- Node.js v18+ and npm
- MongoDB Atlas account
- Cloudinary account

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd civic-issue-platform

# 2. Install root dependencies
npm install

# 3. Install server dependencies
cd server && npm install && cd ..

# 4. Install client dependencies
cd client && npm install && cd ..

# 5. Create environment file
copy .env.example .env
# Edit .env with your MongoDB URI, Cloudinary keys, and JWT secret
```

---

## Running the Application

### Run everything together (recommended)

```bash
# From the project root:
npm run dev
```

This starts both frontend (port 5173) and backend (port 5000) concurrently.

### Run separately

```bash
# Terminal 1 — Backend
npm run server
# OR: cd server && npm run dev

# Terminal 2 — Frontend
npm run client
# OR: cd client && npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **Health check:** http://localhost:5000/api/health

---

## Seed the Database

```bash
# Run from project root (requires .env configured)
npm run seed
```

This creates:
- **Admin:** `admin@civic.local` / `Admin@123456`
- **Authority:** `officer@civic.local` / `Officer@123456`
- **Citizen 1:** `citizen1@civic.local` / `Citizen@123456`
- **Citizen 2:** `citizen2@civic.local` / `Citizen@123456`
- **Citizen 3:** `citizen3@civic.local` / `Citizen@123456`

And demo issues:
| Ticket | Category | State | Notes |
|--------|----------|-------|-------|
| PTH-104 | Pothole | ASSIGNED | 3 citizen reports, CRITICAL |
| GRB-201 | Garbage | OPEN | Overdue, ESCALATED L1 |
| WTL-305 | Water Leak | IN_PROGRESS | AGING |
| STL-402 | Streetlight | CITIZEN_VERIFICATION | Awaiting citizen review |
| DRN-501 | Drainage | OPEN | Normal open issue |

---

## Authentication

### Registration (CITIZEN only)
```
POST /api/auth/register
Body: { name, email, phone, password }
```
Only CITIZEN accounts can self-register. AUTHORITY and ADMIN accounts must be created by the admin.

### Login
```
POST /api/auth/login
Body: { email, password }
Response: { token, user }
```

### JWT Usage
All protected routes require:
```
Authorization: Bearer <token>
```

### Role-Based Access
- **Server-side enforced** via `authenticateToken` + `authorizeRole` middleware
- Frontend route guards redirect unauthorized users — but backend is the source of truth

---

## AI Architecture

```
Image + Context Text
        ↓
  AI_DEMO_MODE=true?
     ↓         ↓
Keyword      MobileNet
Classifier   Feature
(Reliable)   Extraction
     ↓         ↓
  Category + Confidence
        ↓
  128-dim embedding vector
        ↓
  Cosine similarity for duplicate detection
```

**Demo mode (AI_DEMO_MODE=true):** Uses keyword-based deterministic classifier for SIH presentation reliability.
**Production mode:** Uses MobileNet feature extraction. Low confidence is reported honestly rather than fabricated.

Civic categories: `POTHOLE | GARBAGE | STREETLIGHT | WATER_LEAK | WATER_LOGGING | ROAD_DAMAGE | DRAINAGE | OTHER`

---

## Duplicate Clustering Algorithm

```
duplicateScore =
  (0.40 × geoScore)      ← Haversine distance within DUPLICATE_RADIUS_METERS
  (0.35 × imageScore)    ← Cosine similarity of 128-dim embedding vectors
  (0.15 × categoryScore) ← 1.0 if same category, 0.3 if different
  (0.10 × timeScore)     ← Linear decay over 7 days

If duplicateScore ≥ DUPLICATE_THRESHOLD (default 0.75):
  → Create Report record linked to master Issue
  → Increment master.reportCount
  → Recalculate priority
  → Notify citizen: "Your report is linked to #PTH-104"
```

---

## Priority Algorithm

```
Base score by category:
  WATER_LEAK    = 60    WATER_LOGGING = 55
  POTHOLE       = 50    ROAD_DAMAGE   = 50
  DRAINAGE      = 45    STREETLIGHT   = 35
  GARBAGE       = 30    OTHER         = 20

Bonuses:
  +10 per extra report (max +30)
  +10 near SLA deadline (< 20% remaining)
  +25 overdue (past SLA deadline)

Priority bands:
   0–39  → LOW
  40–69  → MEDIUM
  70–84  → HIGH
  85–100 → CRITICAL
```

---

## SLA System

| Department | SLA |
|------------|-----|
| Water Supply | 8 hours |
| Sanitation | 12 hours |
| Drainage | 12 hours |
| Roads | 24 hours |
| Electrical | 24 hours |

SLA deadline is set when an issue is assigned to a department. The cron job runs every 5 minutes to detect aging and escalate breached issues.

**Aging:** `isAging = true` when < 20% of SLA window remains.

---

## Escalation System

```
LEVEL 0 → Field Officer (default)
   ↓ SLA breach
LEVEL 1 → Department Officer
   ↓ SLA breach again
LEVEL 2 → Municipal Authority
   ↓ SLA breach again
LEVEL 3 → Commissioner (maximum)
```

Escalation creates an `Escalation` record and notifies the original reporter. Publicly visible as `🚨 ESCALATED L1` badge.

---

## Resolution Verification Loop

```
OPEN → ASSIGNED → IN_PROGRESS
    ↓
RESOLUTION_SUBMITTED (authority uploads proof)
    ↓
CITIZEN_VERIFICATION (citizen sees before/after)
    ↓                        ↓
ACCEPTED              REJECTED + comment
    ↓                        ↓
RESOLVED              REWORK_REQUIRED
                             ↓
                    Authority resubmits
```

Authorities **must** upload a resolution image and description. Citizens can reject with a mandatory comment. The cycle repeats until accepted.

---

## Postman Testing

1. Import `postman/civic-platform.postman_collection.json` into Postman
2. Set collection variable `baseUrl` to `http://localhost:5000/api`
3. Run "Login — Admin" → token auto-saved to `adminToken`
4. Run "Login — Citizen 1" → token auto-saved to `citizenToken`
5. Test all endpoints

---

## SIH Demo Sequence

### DEMO 1: AI Triage
1. Login as `citizen1@civic.local`
2. Go to **Report Issue**
3. Upload a pothole photo, fill title with "pothole"
4. Submit → See AI classification: **POTHOLE, 88% confidence**

### DEMO 2: Duplicate Clustering
1. Login as `citizen2@civic.local`
2. Report same pothole at same location
3. System detects duplicate → shows **"Linked to #PTH-104 — 2 reports"**
4. Repeat with `citizen3` → **3 reports, priority increased to CRITICAL**

### DEMO 3: Authority Priority Queue
1. Login as `officer@civic.local`
2. Open **Dashboard** → PTH-104 appears at top
3. Show: Priority=CRITICAL, Reports=3, Department=Roads

### DEMO 4: SLA & Escalation
1. Login as `admin@civic.local`
2. Go to **Admin Dashboard** → Demo Controls
3. Click **+12h** → GRB-201 becomes AGING
4. Click **+24h** → GRB-201 escalates to L1 automatically

### DEMO 5: Resolution Verification
1. Authority logs in → opens STL-402
2. Uploads resolution photo + description
3. Citizen logs in → sees before/after comparison
4. Citizen clicks **Reject** + reason: "Lamp still not working"
5. Status → REWORK_REQUIRED
6. Authority resubmits → Citizen accepts → **RESOLVED**

---

## GitHub Setup

```bash
git init
git add .
git commit -m "Initial commit: CivicSense civic issue platform"
git remote add origin https://github.com/<your-username>/civic-issue-platform.git
git push -u origin main
```

The `.gitignore` already excludes `.env`, `node_modules`, and other sensitive files.

---

## Known Limitations

1. **AI Model:** Demo uses keyword classifier. True MobileNet civic fine-tuning requires a labeled dataset and GPU training — not feasible within SIH timeline.
2. **Real-time updates:** Uses polling (30s notification refresh) instead of WebSockets.
3. **Image embeddings:** Demo uses hash-based 128-dim vectors. Production should use real MobileNet penultimate layer.
4. **Voice notes:** Stored as text notes only. Audio recording/transcription not implemented.
5. **No email notifications:** Notifications are in-app only.
6. **Map clustering:** Large numbers of markers can slow the map — not implemented for MVP.

---

## Future Enhancements

- [ ] WebSocket real-time updates
- [ ] Fine-tuned civic image classification model
- [ ] Email/SMS notifications (SendGrid / Twilio)
- [ ] Multi-language support (Hindi, Tamil, etc.)
- [ ] Citizen mobile app (React Native)
- [ ] Ward/zone geographic assignment
- [ ] Analytics export (CSV/PDF)
- [ ] Bulk issue import from legacy systems
- [ ] Public transparency dashboard (no login required)
- [ ] Integration with municipal ERP systems

---

## License

MIT License — for SIH demonstration purposes.

---

*Built with ❤️ for Smart India Hackathon | CivicSense — Making cities work.*
