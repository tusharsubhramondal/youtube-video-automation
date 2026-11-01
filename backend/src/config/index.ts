import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const ROOT_DIR = process.cwd();
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(ROOT_DIR, 'uploads'));
const RENDER_DIR = path.resolve(process.env.RENDER_DIR || path.join(ROOT_DIR, 'renders'));
const TEMP_DIR = path.resolve(path.join(ROOT_DIR, 'temp'));
const VOICE_DIR = path.resolve(path.join(UPLOAD_DIR, 'voices'));

// Ensure storage directories exist
[UPLOAD_DIR, RENDER_DIR, TEMP_DIR, VOICE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/youtube_automation?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-min-32-chars',
  
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  },
  
  youtube: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/youtube/oauth2callback',
  },
  
  storage: {
    rootDir: ROOT_DIR,
    uploadDir: UPLOAD_DIR,
    renderDir: RENDER_DIR,
    tempDir: TEMP_DIR,
    voiceDir: VOICE_DIR,
  },
};

