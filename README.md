# AutoTube Studio | AI YouTube Video Automation Platform

An enterprise-grade, modular, production-ready AI-powered YouTube video automation platform. Enter any video topic and watch 9 specialized autonomous AI agents research, draft, visualize, compose, voiceover, edit, thumbnail, and optimize your video with human-in-the-loop oversight and automated Google YouTube Data API publishing.

![Architecture Diagram](https://raw.githubusercontent.com/user/repo/main/docs/architecture.png)

---

## 🚀 Key Features

- **9 Specialized Autonomous AI Agents**:
  1. **Research Agent**: Deep topic exploration, viral hook angles, and high-intent keyword discovery.
  2. **Script Agent**: Scene-by-scene script writing, narration timing, visual prompts, and camera movements.
  3. **Image Agent**: Automated visual synthesis matching styles (Cinematic, Cyberpunk, Photorealistic, Anime).
  4. **Video Agent**: Dynamic Ken Burns pan/zoom motion camera synthesis turning scene images into MP4 clips.
  5. **Voice Agent**: Spoken voiceover narration audio generation with automatic duration synchronization.
  6. **Editing Agent**: Multi-track FFmpeg composition engine, multi-clip concat, background music ducking, synchronized `.srt` and `.vtt` subtitle generation, and styled burnt-in subtitle rendering.
  7. **Thumbnail Agent**: High-CTR thumbnail concept generation with psychological text overlays.
  8. **SEO Agent**: Viral title variations (CTR scored), rich timestamped descriptions, and search tag clouds.
  9. **Publishing Agent**: Google OAuth 2.0 integration with YouTube Data API v3 (*Mandatory explicit user approval safety gate*).

- **Multi-Format Video Engine**:
  - **YouTube Shorts (9:16 vertical 1080x1920)** with fast hooks.
  - **Regular YouTube Videos (16:9 horizontal 1920x1080)**.
  - Configurable resolution (1080p / 720p) and frame rates (30 fps / 60 fps).

- **Resilient Multi-Provider AI Architecture**:
  - **Dynamic Multi-LLM Router**:
    - **Google Gemini**: Flagship & Flash models (`gemini-flash-latest`, `gemini-3.5-flash-lite`, `gemini-3.8-flash`).
    - **OpenAI**: Flagship chat reasoning (`gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `o1-mini`).
    - **Per-Agent Routing Matrix**: Granular assignment of specific LLMs and engines per autonomous agent (e.g. GPT-4o for Scripting, Gemini Flash-Lite for Research/SEO).
  - **Images**: **100% Real Image Engine (Zero Mock Colored Boxes / SVGs)**:
    - **OpenAI DALL-E 3**: High-fidelity AI generative visuals (when `OPENAI_API_KEY` is provided).
    - **Pollinations AI**: Multi-model free generative AI (`flux`, `sana`, `turbo`) with auto-cooldown retry and `POLLEN_API_KEY` acceleration.
    - **Real Photographic Scene Engine**: Real high-resolution photography from open media archives center-cropped and formatted with FFmpeg (16:9 / 9:16).
  - **Video**: FFmpeg motion synthesizer with Ken Burns pan/zoom effects.
  - **Voice**: Google Free TTS & Microsoft Edge Neural TTS audio generator.
  - **YouTube**: Real Google OAuth 2.0 + Sandbox Mock Channel for offline zero-cost testing.

- **13 Studio Dashboard Pages**:
  1. Dashboard (Metrics, recent projects, pipeline telemetry)
  2. Create New Video (Wizard with format, styles, duration)
  3. Video Projects (Search, filter, status tags)
  4. Project Studio (Overview, progress stepper, quick actions)
  5. AI Agent Monitor (Live logs, terminal output, per-agent retry)
  6. Scene Editor (Storyboard, text/prompt editing, per-scene audio/video generation)
  7. Asset Library (Browse, upload custom footage, preview, delete)
  8. Video Preview & Render (HTML5 player, FFmpeg render controls, direct MP4 download)
  9. Thumbnail Generator (Visual prompt designer, text color & headline editor)
  10. SEO Manager (Titles, timestamped description, tag copy)
  11. YouTube Channel Integration (OAuth connection, channel card, publish modal)
  12. AI Provider Settings (Gemini keys, model selector, active providers)
  13. Application Settings (Engine diagnostics, dark/light theme)

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL 16
- **Task Queue**: BullMQ + Redis (with resilient local async fallback)
- **Video Engine**: FFmpeg (`fluent-ffmpeg` + static bundled binaries)
- **API**: REST architecture with Zod schema validation
- **DevOps**: Docker, Docker Compose

---

## 📦 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v20+
- [Docker](https://www.docker.com/) & Docker Compose (Optional for containerized run)

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Key environment variables:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/youtube_automation?schema=public
REDIS_URL=redis://localhost:6379

# Optional: Set Gemini API Key (leaves empty to run with high-quality Mock Provider)
GEMINI_API_KEY=

# Optional: Google OAuth for YouTube Uploads
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/api/youtube/oauth2callback
```

---

## 🐳 Running with Docker Compose

To launch the full stack (PostgreSQL, Redis, Backend, Frontend) with a single command:
```bash
docker compose up -d
```
- Frontend UI: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## 💻 Running Locally (Development Mode)

### Step 1: Install Dependencies
```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push

# Frontend
cd ../frontend
npm install
```

### Step 2: Start Development Servers
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🔒 Security, Authentication & Safe Publishing

1. **User Authentication & RBAC**:
   - Built-in scrypt password hashing with constant-time cryptographic verification (`timingSafeEqual`).
   - HS256 JWT tokens with bearer authentication middleware.
   - Creator and Admin roles with default studio creator auto-seeding.
   - Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
2. **Explicit Human Confirmation**:
   - The Publishing Agent enforces a strict check where `userApproved === true` must be transmitted. Video publishing will immediately abort with HTTP 400/policy rejection if approval is absent.
3. **Dynamic Voice Profiles & TTS Actor Engine**:
   - Dynamic voice profiles (`POST /api/voices`, `GET /api/voices`, `POST /api/voices/:id/preview`).
   - Instant audio auditioning in the studio creation wizard and settings dashboard.
4. **Secret Isolation**:
   - Frontend never receives or stores third-party API keys or OAuth refresh tokens.
5. **File Validation**:
   - Uploads are restricted by MIME type and bounded by a 100MB limit with Multer validation.

---

## 🧪 Automated Testing Suite

AutoTube Studio includes a comprehensive 13-stage end-to-end integration test suite verifying the complete production lifecycle:

```bash
cd backend
npm run test:e2e
```

**Tested Stages**:
1. PostgreSQL Database Connectivity & Prisma client binding
2. Scrypt password hashing, timingSafeEqual validation, and JWT token issuance
3. Dynamic Voice Profiles engine and auto-seeding
4. Video project initialization & multi-format configuration
5. Agent 1: Research Agent (topic angles & high-intent keywords)
6. Agent 2: Script Agent (scene generation & structured narration)
7. Agent 3: Image Agent (visual synthesis with Pollinations AI & fallback)
8. Agent 5: Voice Agent (TTS audio generation & duration synchronization)
9. Agent 4: Video Agent (FFmpeg Ken Burns motion video synthesis)
10. Agent 6: Editing Agent (Multi-clip concatenation, audio ducking, subtitle burn-in, final master MP4)
11. Agent 7: Thumbnail Agent (high-CTR visual concepts & text overlays)
12. Agent 8: SEO Agent (viral titles, descriptions, and tags)
13. Agent 9: YouTube Publishing Agent with strict user approval guardrail

---

## 📄 License
MIT License. Created for AI content automation and creator workflows.

