# VeritasAI — AI-Generated Media Detection Platform

Detects AI-generated images and videos using forensic analysis across 11 dimensions, and provides plain-language explanations so anyone can understand the results.

## Tech Stack

- **Backend:** Node.js, Express, SQLite (better-sqlite3)
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **AI:** Longcat API (LongCat-Flash-Omni-2603 for vision, LongCat-Flash-Chat for explanations)
- **Video:** FFmpeg via fluent-ffmpeg for frame extraction

## Setup

### Prerequisites

- Node.js 18 or higher
- ffmpeg installed on your system

### Install ffmpeg

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html and add to PATH
```

> **On Railway:** Add the ffmpeg plugin in your Railway project dashboard.
> Railway automatically sets FFMPEG_PATH and FFPROBE_PATH environment
> variables — no manual configuration needed.

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd veritasai

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env

# 4. Fill in your API key from https://longcat.chat/platform
#    and generate a random JWT_SECRET (minimum 32 characters)

# 5. Start the server
npm start

# 6. Open http://localhost:3000
```

### Development (auto-restart on changes)

```bash
npm run dev
```

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | None | Create account |
| POST | /api/auth/login | None | Login, returns JWT |
| GET | /api/auth/me | Required | Get current user |
| POST | /api/analyze | Optional | Analyze image or video |
| POST | /api/upload | Optional | Upload media file |
| GET | /api/scans/:id | None | Get scan by ID |
| GET | /api/scans/history | Required | Get user's scan history |
| GET | /api/budget | None | Get today's token usage |
| GET | /api/health | None | Health check |

## Rate Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Global | 200 requests | 15 minutes per IP |
| Analysis (anonymous) | 15 scans | 1 hour per IP |
| Auth (login/register) | 10 attempts | 15 minutes per IP |

Logged-in users skip the analysis rate limiter (governed by the global limit instead).

## Security

- Helmet security headers
- SSRF protection (blocks private IPs, internal hostnames, non-HTTP protocols)
- Input sanitization (URL length, path traversal prevention)
- Magic-byte file type verification (not just MIME sniffing)
- bcrypt password hashing (12 rounds)
- JWT authentication (7-day expiry)
- Timing-attack resistant login
- Automatic cleanup of stale uploads (every 30 min)
- Parameterized SQL queries throughout

## Deployment (Railway)

1. Push to GitHub
2. Connect repo to [Railway](https://railway.app)
3. Add environment variables in Railway dashboard
4. Add ffmpeg plugin in Railway settings
5. Deploy
