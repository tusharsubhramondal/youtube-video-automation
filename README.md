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
  - **LLM**: Google Gemini 1.5/2.0 API with seamless fallback to Local Mock Provider.
  - **Images**: Pollinations AI (free high-res image generation with 0 API keys) & Mock SVG/Canvas engine.
  - **Video**: FFmpeg motion synthesizer.
  - **Voice**: Google Free TTS & Mock Audio Generator.
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

## 🔒 Security & Safe Publishing

1. **Explicit Human Confirmation**: The Publishing Agent enforces a strict check where `userApproved === true` must be transmitted. Video publishing will reject requests if approval is absent.
2. **Secret Isolation**: Frontend never receives or stores third-party API keys or OAuth refresh tokens.
3. **File Validation**: Uploads are restricted by MIME type and bounded by a 100MB limit.

---

## 📄 License
MIT License. Created for AI content automation and creator workflows.

