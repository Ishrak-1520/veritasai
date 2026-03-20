# VeritasAI — Project Context

> **Last Updated:** 2026-03-20
> **Version:** 1.0.0
> **Repository:** Ishrak-1520/veritasai

---

## 1. Project Overview

**VeritasAI** is an AI-generated media detection platform. Users paste a URL or upload an image/video, and the system runs a multi-dimensional forensic analysis powered by the Longcat API to determine whether the media is AI-generated, authentic, or inconclusive. Results include a confidence score, individual forensic signals, and plain-language educational explanations.

### Core Value Proposition
- Detects AI-generated images and videos across **11 forensic dimensions**
- Provides **plain-language explanations** so non-technical users understand the results
- Supports both **URL analysis** and **direct file upload** (images + videos)
- Video analysis via **FFmpeg frame extraction** and per-frame analysis with aggregation

---

## 2. Tech Stack

| Layer       | Technology                                          |
|-------------|-----------------------------------------------------|
| Runtime     | Node.js 18+                                         |
| Framework   | Express 5.x                                         |
| Database    | SQLite via `@libsql/client` (local file or Turso Cloud) |
| Frontend    | Vanilla HTML, CSS, JavaScript (no framework)         |
| AI Models   | Longcat API — `LongCat-Flash-Omni-2603` (vision), `LongCat-Flash-Chat` (text) |
| Video       | FFmpeg via `fluent-ffmpeg` for frame extraction       |
| Auth        | JWT (jsonwebtoken) + bcrypt password hashing          |
| Security    | Helmet, CORS, rate limiting, SSRF protection          |
| File Upload | Multer with magic-byte verification (file-type)       |
| Deployment  | Render (render.yaml), also supports Railway/Heroku    |

### Key Dependencies (`package.json`)

```
@libsql/client    — Turso/LibSQL database client
bcrypt             — Password hashing (12 rounds)
better-sqlite3     — SQLite3 bindings (legacy/local fallback)
cors               — Cross-origin resource sharing
dotenv             — Environment variable loading
express            — Web framework (v5)
express-rate-limit — Request rate limiting
file-type          — Magic-byte file type detection
fluent-ffmpeg      — FFmpeg wrapper for video processing
helmet             — HTTP security headers
jsonwebtoken       — JWT signing and verification
multer             — Multipart file upload handling
nanoid             — Unique ID generation for scan records
node-fetch         — HTTP client for fetching URLs
```

---

## 3. Directory Structure

```
Vertias/
├── .env                      # Environment variables (gitignored)
├── .env.example              # Template for environment variables
├── .gitignore                # Git ignore rules
├── CONTEXT.md                # This file
├── Procfile                  # Heroku/Railway process definition
├── README.md                 # Project readme and API reference
├── package.json              # npm project manifest
├── package-lock.json         # Dependency lock file
├── render.yaml               # Render deployment configuration
│
├── db/                       # SQLite database directory
│   ├── .gitignore            # Ignores *.db files
│   ├── .gitkeep              # Keep empty directory in Git
│   └── app.db                # SQLite database file (gitignored)
│
├── server/                   # Backend application code
│   ├── index.js              # Express server entry point
│   ├── lib/                  # Shared libraries and utilities
│   │   ├── auth.js           # JWT authentication middleware
│   │   ├── cleanup.js        # Automatic stale upload cleanup
│   │   ├── db.js             # Database initialization and connection
│   │   ├── frameExtract.js   # FFmpeg video frame extraction
│   │   ├── longcat.js        # Longcat API client (vision + chat)
│   │   └── prompts.js        # System prompts for AI analysis
│   └── routes/               # Express route handlers
│       ├── analyze.js        # POST /api/analyze — core detection pipeline
│       ├── auth.js           # POST /api/auth/register, /login, GET /me
│       ├── scans.js          # GET /api/scans/:id, /api/scans/history
│       └── upload.js         # POST /api/upload — file upload handling
│
├── public/                   # Static frontend files
│   ├── index.html            # Homepage — media submission form
│   ├── scan.html             # Scan result page
│   ├── login.html            # Login page
│   ├── register.html         # Registration page
│   ├── history.html          # Scan history page (auth required)
│   ├── css/
│   │   └── style.css         # Complete stylesheet (~19KB)
│   └── js/
│       ├── utils.js          # Global utility functions (auth, formatting, nav)
│       ├── main.js           # Homepage logic (tabs, upload, analyze)
│       ├── results.js        # Scan result page rendering
│       └── history.js        # History page data loading
│
└── uploads/                  # Temporary uploaded files (auto-cleaned)
```

---

## 4. Architecture & Data Flow

### 4.1 Analysis Pipeline (POST /api/analyze)

This is the core functionality. The pipeline in `server/routes/analyze.js` follows 9 steps:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Step 1      │     │  Step 2      │     │  Step 2.5        │
│  Budget      │────▶│  Input       │────▶│  Input           │
│  Check       │     │  Validation  │     │  Sanitization    │
└──────────────┘     └──────────────┘     └──────────────────┘
                                                   │
                     ┌──────────────┐     ┌────────▼─────────┐
                     │  Step 4      │     │  Step 3          │
                     │  Media       │◀────│  SSRF            │
                     │  Loading     │     │  Protection      │
                     └──────┬───────┘     └──────────────────┘
                            │
               ┌────────────▼────────────┐
               │  Step 5 (video only)    │
               │  FFmpeg Frame           │
               │  Extraction             │
               └────────────┬────────────┘
                            │
               ┌────────────▼────────────┐
               │  Step 6                 │
               │  Longcat Vision Model   │
               │  (Forensic Analysis)    │
               │  LongCat-Flash-Omni-2603│
               └────────────┬────────────┘
                            │
               ┌────────────▼────────────┐
               │  Step 7                 │
               │  Longcat Chat Model     │
               │  (Education Layer)      │
               │  LongCat-Flash-Chat     │
               └────────────┬────────────┘
                            │
          ┌─────────────────▼────────────────┐
          │  Step 8: Save to SQLite          │
          │  Step 9: Return JSON response    │
          └──────────────────────────────────┘
```

### 4.2 Video Analysis Flow

When the input is a video:
1. **Frame Extraction** (`server/lib/frameExtract.js`):
   - Probes video duration with `ffprobe`
   - If duration ≥ 3s → extracts frames at 10%, 50%, 90% timestamps
   - If duration < 3s → extracts single frame at 0.5s
   - Returns base64-encoded JPEG frames
2. **Per-Frame Analysis**: Each frame is sent to `analyzeImage()` independently
3. **Aggregation**: Results are merged:
   - If any frame is `AI_GENERATED` → verdict = `AI_GENERATED`, confidence = max of AI frames
   - If all frames `AUTHENTIC` → verdict = `AUTHENTIC`, confidence = average
   - Otherwise → verdict = `UNCERTAIN`, confidence = average
   - Signals are deduplicated by name, highest severity kept, top 8 returned

### 4.3 Forensic Dimensions (11 total)

The AI vision model evaluates each image across these forensic dimensions (defined in `server/lib/prompts.js`):

1. **Facial Geometry** — Landmark symmetry, ear rendering, hairline, proportions
2. **Skin Texture** — Over-smoothing, pore absence, plastic rendering
3. **Hair Coherence** — Strand rendering, clumping, flow direction
4. **Eye Reflections** — Catchlight consistency, pupil geometry, iris detail
5. **Hand/Finger Anatomy** — Finger count, joint proportions, merged digits
6. **Lighting/Shadow Consistency** — Shadow direction, specular highlights, ambient occlusion
7. **Background Plausibility** — Spatial relationships, perspective, contextual realism
8. **Edge Artifacts** — Boundary blurring, composite seams, halo effects
9. **GAN/Diffusion Artifacts** — Checkerboard patterns, noise distributions, color banding
10. **Text Legibility** — Character coherence, letterform validity
11. **Semantic Coherence** — Overall scene plausibility

### 4.4 AI Response Schema

**Forensic Report** (from vision model):
```json
{
  "verdict": "AI_GENERATED" | "AUTHENTIC" | "UNCERTAIN",
  "confidence": 0-100,
  "summary": "2-3 sentence conclusion",
  "suspected_model": "Stable Diffusion" | null,
  "generation_technique": "latent diffusion" | null,
  "signals": [
    {
      "name": "FACIAL GEOMETRY",
      "severity": "CRITICAL" | "WARNING" | "NOTE" | "CLEAR",
      "technical_description": "2-3 sentences"
    }
  ]
}
```

**Education Report** (from chat model):
```json
{
  "how_detected": "Plain-language explanation of the verdict",
  "what_to_look_for": "Visual clues users can look for themselves",
  "technology_note": "About the AI technology that created the content"
}
```

---

## 5. Database Schema

SQLite database at `db/app.db` (or Turso Cloud if `TURSO_DATABASE_URL` is set).

### Tables

**`users`**
| Column        | Type     | Constraints                  |
|---------------|----------|------------------------------|
| id            | TEXT     | PRIMARY KEY                  |
| email         | TEXT     | UNIQUE                       |
| password_hash | TEXT     |                              |
| created_at    | DATETIME | DEFAULT CURRENT_TIMESTAMP    |

**`scans`**
| Column          | Type     | Constraints                  |
|-----------------|----------|------------------------------|
| id              | TEXT     | PRIMARY KEY                  |
| user_id         | INTEGER  | Nullable (anonymous scans)   |
| input_type      | TEXT     | 'url' or 'upload'            |
| input_value     | TEXT     | URL string or temp file ID   |
| media_type      | TEXT     | 'image' or 'video'           |
| type            | TEXT     | Legacy column                |
| media_url       | TEXT     | Legacy column                |
| verdict         | TEXT     | AI_GENERATED / AUTHENTIC / UNCERTAIN |
| confidence      | INTEGER  | 0-100                        |
| signals_json    | TEXT     | JSON-stringified signals array |
| explanation     | TEXT     | JSON-stringified education object |
| suspected_model | TEXT     | Nullable                     |
| created_at      | DATETIME | DEFAULT CURRENT_TIMESTAMP    |

**`token_usage`**
| Column      | Type    | Constraints |
|-------------|---------|-------------|
| date        | TEXT    | PRIMARY KEY |
| tokens_used | INTEGER | DEFAULT 0   |

### Migrations

The database includes auto-applied migrations in `db.js` that use `ALTER TABLE ... ADD COLUMN` with error suppression (column-already-exists is expected). This allows the schema to evolve safely.

---

## 6. API Reference

### Authentication

| Method | Path                | Auth     | Description                    |
|--------|---------------------|----------|--------------------------------|
| POST   | `/api/auth/register`| None     | Create account (email + password) |
| POST   | `/api/auth/login`   | None     | Login, returns JWT token        |
| GET    | `/api/auth/me`      | Required | Get current user profile        |

**JWT tokens** expire in 7 days. Stored in localStorage on the client as `veritasai_token`.

### Analysis

| Method | Path            | Auth     | Description                          |
|--------|-----------------|----------|--------------------------------------|
| POST   | `/api/analyze`  | Optional | Analyze image or video               |
| POST   | `/api/upload`   | None     | Upload media file (returns tempFileId) |

**POST /api/analyze body:**
```json
{
  "type": "url" | "upload",
  "url": "https://...",        // if type=url
  "tempFileId": "filename"     // if type=upload
}
```

### Scans

| Method | Path                  | Auth     | Description              |
|--------|-----------------------|----------|--------------------------|
| GET    | `/api/scans/:id`      | None     | Get scan by ID           |
| GET    | `/api/scans/history`  | Required | Get user's scan history (last 20) |

### Utility

| Method | Path          | Auth | Description              |
|--------|---------------|------|--------------------------|
| GET    | `/api/budget` | None | Get today's token usage  |
| GET    | `/api/health` | None | Health check endpoint    |

---

## 7. Security Model

### Server-Side

1. **Helmet** — Sets security headers (CSP disabled for inline content, COEP disabled)
2. **SSRF Protection** (`validateUrl()` in `routes/analyze.js`):
   - Blocks `file://`, `ftp://`, `javascript://` protocols
   - Rejects private IP ranges: `10.x`, `192.168.x`, `127.x`, `169.254.x`, `172.16-31.x`
   - Blocks internal hostnames: `localhost`, `0.0.0.0`, `::1`
   - Rejects hostnames shorter than 4 characters
3. **Input Sanitization**:
   - URL length limit: 2000 characters
   - File ID regex validation: `^[a-zA-Z0-9_\-.]+$`
   - Path traversal prevention in uploaded filenames
4. **Magic-Byte Verification** — Uses `file-type` library to verify actual file content (not just MIME)
5. **bcrypt** — Password hashing with 12 salt rounds
6. **JWT Auth** — 7-day token expiry, minimum 32-char secret enforced
7. **Timing-Attack Resistant Login** — Always runs `bcrypt.compare()` even for non-existent users
8. **Parameterized SQL** — All queries use parameterized args (no string interpolation)
9. **Upload Cleanup** — Automatic deletion of files older than 1 hour, runs every 30 minutes

### Rate Limiting

| Scope               | Limit           | Window         | Notes                      |
|----------------------|-----------------|----------------|----------------------------|
| Global               | 200 requests    | 15 min per IP  | All API routes             |
| Analysis (anonymous) | 15 scans        | 1 hour per IP  | Authenticated users bypass |
| Auth (login/register)| 10 attempts     | 15 min per IP  |                            |

### Client-Side

- HTML escaping via `escapeHtml()` function in `results.js`
- Auth tokens stored in `localStorage` with prefix `veritasai_`
- `X-Content-Type-Options: nosniff` meta tag on all pages
- `Referrer-Policy: strict-origin-when-cross-origin` meta tag

---

## 8. Frontend Architecture

### Pages

| Page              | File            | Script(s)              | Purpose                      |
|-------------------|-----------------|------------------------|------------------------------|
| Homepage          | `index.html`    | `utils.js`, `main.js`  | Media submission form        |
| Scan Result       | `scan.html`     | `utils.js`, `results.js` | Display analysis results   |
| Login             | `login.html`    | `utils.js` + inline    | User authentication          |
| Register          | `register.html` | `utils.js` + inline    | Account creation             |
| History           | `history.html`  | `utils.js`, `history.js` | Past scans (auth required) |

### JavaScript Modules

**`utils.js`** — Global utilities loaded on every page:
- `getToken()`, `getUserId()`, `authHeaders()`, `uploadAuthHeaders()` — Auth helpers
- `isLoggedIn()`, `saveAuth()`, `clearAuth()` — Session management
- `formatDate()` — ISO date formatting
- `verdictColorClass()`, `verdictLabel()` — Verdict display helpers
- `severityColorClass()`, `severityIcon()` — Signal severity display
- `showError()`, `hideError()` — Form error display
- `initNav()` — Navigation bar auth state management

**`main.js`** — Homepage (index.html):
- Tab switching (URL paste vs file upload)
- File drag-and-drop with image preview
- URL input validation (requires http/https)
- Analyze button with loading overlay and rotating status messages
- Token budget bar visualization
- Two-step upload flow: Upload → Analyze

**`results.js`** — Scan result page (scan.html):
- Fetches scan data by ID from URL query parameter
- Renders verdict banner with color coding (red/green/amber)
- Renders forensic signal cards in grid layout
- Collapsible education sections (how detected, what to look for, technology)
- Copy full report to clipboard
- Share link functionality

**`history.js`** — History page (history.html):
- Auth-gated (redirects to login if not authenticated)
- Loads last 20 scans via `/api/scans/history`
- Renders history table with verdict badges and view links

### SPA Fallback

The server serves `index.html` for any non-API GET request (`app.get(/^(?!\/api).*/)`), allowing client-side routing. However, the frontend currently uses traditional multi-page navigation.

---

## 9. AI Integration (Longcat API)

### Two API Formats

The Longcat API provides two compatible interfaces, both used by VeritasAI:

1. **OpenAI-Compatible** (`https://api.longcat.chat/openai/v1/chat/completions`)
   - Model: `LongCat-Flash-Omni-2603` (vision model)
   - Used for: Image forensic analysis
   - Handles: Base64 image input + system prompt → JSON forensic report

2. **Anthropic-Compatible** (`https://api.longcat.chat/anthropic/v1/messages`)
   - Model: `LongCat-Flash-Chat` (text model)
   - Used for: Generating plain-language explanations
   - Handles: Forensic JSON input → educational explanation JSON

### Error Handling

- **Retry Logic**: Both API callers retry once after a 2-second delay on failure
- **Timeout**: Vision model = 120s, Chat model = 90s (AbortController)
- **JSON Repair** (`repairJson()`): Handles common LLM output issues:
  - Strips markdown code fences
  - Extracts JSON from surrounding text
  - Fixes single-quoted keys
  - Removes trailing commas
  - Quotes unquoted enum values (verdict field)
- **Fallback**: If vision model JSON still can't be parsed, returns `UNCERTAIN` verdict with 0 confidence

### Token Budget System

- Daily limit: **4,500,000 tokens**
- Tracked in `token_usage` table with upsert on conflict
- Budget checked before each analysis (returns 429 if exhausted)
- Tokens from both models are tracked (input + output)
- Budget bar displayed on homepage with color coding (green < 50%, amber < 80%, red ≥ 80%)

---

## 10. Environment Variables

| Variable             | Required | Description                                      |
|----------------------|----------|--------------------------------------------------|
| `LONGCAT_API_KEY`    | Yes      | API key from longcat.chat/platform               |
| `JWT_SECRET`         | Yes      | Minimum 32-character secret for JWT signing       |
| `PORT`               | No       | Server port (default: 3000)                      |
| `TURSO_DATABASE_URL` | No       | Turso cloud database URL (uses local SQLite if not set) |
| `TURSO_AUTH_TOKEN`   | No       | Turso authentication token                       |
| `FFMPEG_PATH`        | No       | Custom path to ffmpeg binary                     |
| `FFPROBE_PATH`       | No       | Custom path to ffprobe binary                    |

---

## 11. Deployment

### Render (Primary)

Configured via `render.yaml`:
- **Type**: Web service
- **Runtime**: Node
- **Build**: `npm install`
- **Start**: `node server/index.js`
- **FFmpeg**: Paths set to `/usr/bin/ffmpeg` and `/usr/bin/ffprobe` (pre-installed on Render)

### Railway (Alternative)

- Add FFmpeg plugin in Railway dashboard
- Railway auto-sets `FFMPEG_PATH` and `FFPROBE_PATH`
- Set `LONGCAT_API_KEY`, `JWT_SECRET`, and optionally Turso variables in dashboard

### Heroku (Alternative)

Configured via `Procfile`:
```
web: node server/index.js
```

### Local Development

```bash
npm install
cp .env.example .env
# Fill in LONGCAT_API_KEY and JWT_SECRET
npm run dev        # Auto-restart on changes (node --watch)
# Visit http://localhost:3000
```

---

## 12. Key Design Decisions

1. **No Frontend Framework**: Vanilla HTML/CSS/JS for zero build step and minimal complexity
2. **Dual AI Model Strategy**: Vision model for forensic analysis, separate chat model for plain-language explanations — separates concerns and allows independent prompt tuning
3. **SQLite + Turso**: Local SQLite for development, Turso Cloud for production — same API via @libsql/client
4. **Anonymous + Authenticated Usage**: Analysis works without login (rate-limited), authenticated users get higher limits and scan history
5. **Two-Step Upload**: File upload returns `tempFileId`, then analyze uses that ID — separates upload validation from analysis
6. **Frame Extraction Strategy**: 3 frames for long videos (10%, 50%, 90%), 1 frame for short — balances API cost vs detection accuracy
7. **JSON Repair Layer**: Robust handling of LLM output formatting issues rather than relying on perfect JSON from the model
8. **Signal Deduplication**: For video analysis, signals from multiple frames are deduplicated by name with highest severity kept

---

## 13. File-by-File Reference

### Server Files

| File | Lines | Purpose |
|------|-------|---------|
| `server/index.js` | 180 | Express app setup, middleware, rate limiters, route mounting, SPA fallback, server startup |
| `server/lib/auth.js` | 44 | `requireAuth` and `optionalAuth` JWT middleware |
| `server/lib/cleanup.js` | 48 | `cleanupOldUploads()` — deletes upload files older than 1 hour |
| `server/lib/db.js` | 92 | `getDb()` returns LibSQL client, `initializeDatabase()` creates tables and runs migrations |
| `server/lib/frameExtract.js` | 121 | `extractFrames(videoPath)` — FFmpeg-based video frame extraction |
| `server/lib/longcat.js` | 366 | Longcat API client: `analyzeImage()`, `generateExplanation()`, `trackTokenUsage()`, `checkTokenBudget()`, JSON repair, retry logic, self-test |
| `server/lib/prompts.js` | 74 | `FORENSIC_PROMPT` (vision analysis instructions) and `EDUCATION_PROMPT` (explanation instructions) |
| `server/routes/analyze.js` | 330 | Core 9-step analysis pipeline: budget → validate → sanitize → SSRF check → load media → extract frames → detect → explain → save |
| `server/routes/auth.js` | 121 | Registration, login (timing-attack resistant), and `/me` endpoint |
| `server/routes/scans.js` | 71 | Scan retrieval by ID and authenticated history (last 20) |
| `server/routes/upload.js` | 100 | Multer upload with magic-byte verification, 50MB limit |

### Frontend Files

| File | Lines | Purpose |
|------|-------|---------|
| `public/index.html` | 150 | Homepage with hero section, media submission form (URL/upload tabs), budget bar, "How it Works" section |
| `public/scan.html` | 143 | Scan results page with verdict banner, signals grid, education sections, copy/share actions |
| `public/login.html` | 91 | Login form with email/password, inline script |
| `public/register.html` | 105 | Registration form with password confirmation, inline script |
| `public/history.html` | 66 | Scan history table (auth-gated) |
| `public/css/style.css` | ~660 | Complete stylesheet — dark theme, card layouts, verdict colors, responsive design |
| `public/js/utils.js` | 120 | Shared utilities: auth, date formatting, verdict/severity helpers, nav management |
| `public/js/main.js` | 256 | Homepage: tabs, upload handling, drag-drop, analyze flow, loading overlay |
| `public/js/results.js` | 172 | Results page: scan rendering, signal cards, collapsibles, copy report, share link |
| `public/js/history.js` | 69 | History page: auth check, load and render scan history table |

### Config Files

| File | Purpose |
|------|---------|
| `.env.example` | Environment variable template |
| `.gitignore` | Ignores node_modules, .env, uploads, db files |
| `Procfile` | Heroku/Railway process definition |
| `render.yaml` | Render deployment configuration |
| `package.json` | npm manifest with dependencies and scripts |
