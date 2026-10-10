import fs from 'node:fs';
import path from 'node:path';
import { generateH3 } from '../src/generators.mjs';
import { getClipDir, getProjectState } from '../src/projects.mjs';

const [,, projName, clipIdxStr, attemptIdxStr] = process.argv;
const clipIndex = parseInt(clipIdxStr, 10);
const attemptIndex = parseInt(attemptIdxStr || '1', 10);

const state = getProjectState(projName);
const shot = state.shots.find(s => s.shotIndex === clipIndex);

if (!shot) {
  console.error('Shot not found:', clipIndex);
  process.exit(1);
}

const statusFile = path.resolve('projects', projName, `render_status_clip${clipIndex}.json`);
fs.writeFileSync(statusFile, JSON.stringify({ status: 'running', startTime: Date.now() }), 'utf8');

const attemptDir = getClipDir(projName, clipIndex, attemptIndex);

const job = {
  mode: 'ref2va',
  durationSeconds: shot.durationSeconds || 10,
  prompt: {
    integrated_multimodal_description: shot.scenePrompt,
    overall_soundscape: shot.speech || 'Dynamic commercial soundscape',
    non_diegetic_music: shot.music ? 'Energetic modern electronic rock beat' : ''
  },
  refImages: shot.refImages || [],
  hiresFinish: true,
  hiresStartMp: 0.5,
  hiresFinalMp: 1.6,
  turboMode: 'pdd'
};

console.log(`[RENDER START] Project: ${projName}, Clip: ${clipIndex}, Attempt: ${attemptIndex}`);

generateH3(job, { outDir: attemptDir })
  .then(res => {
    console.log(`[RENDER DONE] Clip: ${clipIndex}, ok: ${res.ok}`);
    fs.writeFileSync(statusFile, JSON.stringify({
      status: 'done',
      ok: res.ok,
      videoPath: res.localFiles?.find(f => f.endsWith('.mp4')) || res.localFiles?.[0],
      duration: shot.durationSeconds,
      seed: res.seed,
      error: res.error,
      endTime: Date.now()
    }), 'utf8');
  })
  .catch(err => {
    console.error(`[RENDER FAIL] Clip: ${clipIndex}:`, err);
    fs.writeFileSync(statusFile, JSON.stringify({
      status: 'error',
      ok: false,
      error: err.message,
      endTime: Date.now()
    }), 'utf8');
  });
