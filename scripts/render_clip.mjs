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

let promptObj = {};
if (shot.prompt && typeof shot.prompt === 'object') {
  promptObj = {
    integrated_multimodal_description: shot.prompt.integrated_multimodal_description || '',
    overall_soundscape: shot.prompt.overall_soundscape || 'Natural room ambience',
    non_diegetic_music: shot.prompt.non_diegetic_music || 'N/A'
  };
} else if (shot.scenePrompt && typeof shot.scenePrompt === 'object') {
  promptObj = {
    integrated_multimodal_description: shot.scenePrompt.integrated_multimodal_description || '',
    overall_soundscape: shot.scenePrompt.overall_soundscape || 'Natural room ambience',
    non_diegetic_music: shot.scenePrompt.non_diegetic_music || 'N/A'
  };
} else {
  promptObj = {
    integrated_multimodal_description: typeof shot.scenePrompt === 'string' ? shot.scenePrompt : (shot.prompt || ''),
    overall_soundscape: typeof shot.speech === 'string' ? shot.speech : 'Natural room ambience and foley',
    non_diegetic_music: shot.music ? 'Energetic upbeat acoustic pop beat' : 'N/A'
  };
}

const resolvedRefImages = (shot.refImages || []).map(p => {
  if (path.isAbsolute(p)) return p;
  return path.resolve('projects', projName, p);
});

const aspect = shot.aspect || (state.brief?.description?.includes('9:16') ? '9:16 Portrait' : '16:9 Landscape');

const job = {
  mode: 'ref2va',
  durationSeconds: shot.durationSeconds || 6,
  aspect,
  prompt: promptObj,
  refImages: resolvedRefImages,
  hiresFinish: true,
  hiresStartMp: 0.5,
  hiresFinalMp: 1.6,
  turboMode: 'pdd'
};

console.log(`[RENDER START] Project: ${projName}, Clip: ${clipIndex}, Attempt: ${attemptIndex}, Aspect: ${aspect}`);

generateH3(job, { outDir: attemptDir })
  .then(res => {
    console.log(`[RENDER DONE] Clip: ${clipIndex}, ok: ${res.ok}`);
    const videoFile = res.localFiles?.find(f => f.endsWith('.mp4')) || res.localFiles?.[0];

    // Reference files mapping
    const refList = resolvedRefImages.map((refPath, idx) => ({
      index: idx + 1,
      label: `<Picture ${idx + 1}>`,
      filename: path.basename(refPath),
      fullPath: path.resolve(refPath)
    }));

    const promptRecord = {
      projectName: projName,
      clipIndex,
      attemptIndex,
      mode: job.mode,
      durationSeconds: job.durationSeconds,
      aspect,
      references: refList,
      prompt: job.prompt,
      seed: res.seed,
      videoPath: videoFile,
      timestamp: new Date().toISOString()
    };

    try {
      fs.writeFileSync(path.join(attemptDir, 'prompt.json'), JSON.stringify(promptRecord, null, 2), 'utf8');

      const refLines = refList.length > 0
        ? refList.map(r => `  ${r.label}: ${r.filename} (${r.fullPath})`).join('\n')
        : '  None';

      const promptText = `================================================================================
CLIP PROMPT & REFERENCE SPECIFICATION
================================================================================
Project:   ${projName}
Clip:      Shot ${clipIndex} (Attempt ${attemptIndex})
Duration:  ${job.durationSeconds}s | Mode: ${job.mode} | Aspect: ${aspect}
Seed:      ${res.seed ?? 'random'}
Timestamp: ${promptRecord.timestamp}

--------------------------------------------------------------------------------
1. USED REFERENCE IMAGES
--------------------------------------------------------------------------------
${refLines}

--------------------------------------------------------------------------------
2. INTEGRATED MULTIMODAL DESCRIPTION (Visuals, Camera & Spoken Voice)
--------------------------------------------------------------------------------
${job.prompt.integrated_multimodal_description || ''}

--------------------------------------------------------------------------------
3. OVERALL SOUNDSCAPE (Foley & Ambience)
--------------------------------------------------------------------------------
${job.prompt.overall_soundscape || 'N/A'}

--------------------------------------------------------------------------------
4. NON-DIEGETIC MUSIC (BGM)
--------------------------------------------------------------------------------
${job.prompt.non_diegetic_music || 'N/A'}
================================================================================
`;
      fs.writeFileSync(path.join(attemptDir, 'prompt.txt'), promptText, 'utf8');
    } catch (saveErr) {
      console.error('Error saving prompt file:', saveErr);
    }

    fs.writeFileSync(statusFile, JSON.stringify({
      status: 'done',
      ok: res.ok,
      videoPath: videoFile,
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
