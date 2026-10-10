import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Read .env if present
const envPath = path.join(ROOT_DIR, '.env');
const envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      envVars[key] = val;
    }
  }
}

export const config = {
  port: parseInt(process.env.DIRECTOR_PORT || envVars.DIRECTOR_PORT || '3210', 10),
  host: process.env.DIRECTOR_HOST || envVars.DIRECTOR_HOST || '0.0.0.0',
  authToken: process.env.DIRECTOR_TOKEN || envVars.DIRECTOR_TOKEN || 'aione-director-secret-token-2026',
  rootDir: ROOT_DIR,
  projectsDir: path.resolve(ROOT_DIR, 'projects'),
  comfyConfigPath: path.resolve(ROOT_DIR, 'comfy.json'),
  pythonEmbeded: 'C:\\AI\\ComfyUI-Easy-Install\\python_embeded\\python.exe',
  ffmpegPath: 'ffmpeg',
  ffprobePath: 'ffprobe',
  koreanFontPath: 'C:\\Windows\\Fonts\\malgun.ttf',
  maxAttemptsPerClip: 3,
  concurrencyLimit: 1
};
