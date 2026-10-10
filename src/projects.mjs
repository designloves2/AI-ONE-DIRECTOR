import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';
import { sanitizePath } from './security.mjs';

export function getProjectPath(projectName) {
  const dir = path.resolve(config.projectsDir, projectName);
  return sanitizePath(dir, projectName);
}

export function initProject(projectName, brief = {}) {
  const projDir = getProjectPath(projectName);

  const subdirs = [
    projDir,
    path.join(projDir, 'refs'),
    path.join(projDir, 'clips'),
    path.join(projDir, 'audio'),
    path.join(projDir, 'final')
  ];

  for (const dir of subdirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const briefPath = path.join(projDir, 'brief.json');
  fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2), 'utf8');

  const projectStatePath = path.join(projDir, 'project.json');
  const initialState = {
    name: projectName,
    createdAt: new Date().toISOString(),
    status: 'created',
    currentStage: 'scenario',
    brief,
    scenario: null,
    shots: [],
    clips: {},
    finalVideo: null,
    report: null
  };
  fs.writeFileSync(projectStatePath, JSON.stringify(initialState, null, 2), 'utf8');

  return { ok: true, projectDir: projDir, state: initialState };
}

export function getProjectState(projectName) {
  const projDir = getProjectPath(projectName);
  const statePath = path.join(projDir, 'project.json');
  if (!fs.existsSync(statePath)) {
    throw new Error(`Project '${projectName}' not found`);
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

export function updateProjectState(projectName, patch) {
  const projDir = getProjectPath(projectName);
  const statePath = path.join(projDir, 'project.json');
  const current = getProjectState(projectName);
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  fs.writeFileSync(statePath, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

export function saveScenario(projectName, scenarioData) {
  const projDir = getProjectPath(projectName);
  const scenarioPath = path.join(projDir, 'scenario.json');
  fs.writeFileSync(scenarioPath, JSON.stringify(scenarioData, null, 2), 'utf8');
  return updateProjectState(projectName, {
    scenario: scenarioData,
    shots: scenarioData.shots || [],
    currentStage: 'production'
  });
}

export function getClipDir(projectName, clipIndex, attemptIndex = null) {
  const projDir = getProjectPath(projectName);
  const padClip = String(clipIndex).padStart(2, '0');
  const clipDir = path.join(projDir, 'clips', `clip${padClip}`);
  if (!fs.existsSync(clipDir)) {
    fs.mkdirSync(clipDir, { recursive: true });
  }

  if (attemptIndex !== null) {
    const attemptDir = path.join(clipDir, `attempt${attemptIndex}`);
    if (!fs.existsSync(attemptDir)) {
      fs.mkdirSync(attemptDir, { recursive: true });
    }
    return attemptDir;
  }
  return clipDir;
}

export function saveClipPromptRecord(projectName, clipIndex, attemptIndex, record) {
  const attemptDir = getClipDir(projectName, clipIndex, attemptIndex);

  // 1. Write prompt.json
  const promptJsonPath = path.join(attemptDir, 'prompt.json');
  fs.writeFileSync(promptJsonPath, JSON.stringify(record, null, 2), 'utf8');

  // 2. Write human-readable prompt.txt
  const promptTxtPath = path.join(attemptDir, 'prompt.txt');

  const refLines = (record.refImages || []).map((img, idx) => {
    const filename = path.basename(img);
    return `<Picture ${idx + 1}>: ${filename} (Path: ${img})`;
  }).join('\n') || 'None';

  let descText = '';
  let soundText = '';
  let musicText = '';

  if (typeof record.prompt === 'string') {
    descText = record.prompt;
  } else if (record.prompt && typeof record.prompt === 'object') {
    descText = record.prompt.integrated_multimodal_description || '';
    soundText = record.prompt.overall_soundscape || '';
    musicText = record.prompt.non_diegetic_music || '';
  }

  const txtContent = `================================================================================
AI ONE DIRECTOR — CLIP PROMPT RECORD
Project: ${projectName} | Clip: ${clipIndex} | Attempt: ${attemptIndex}
Mode: ${record.mode || 'ref2va'} | Duration: ${record.durationSeconds || 10}s | Seed: ${record.seed ?? 'N/A'}
Generated Video: ${record.videoPath ? path.basename(record.videoPath) : 'pending/dry_run'}
Timestamp: ${record.timestamp || new Date().toISOString()}
================================================================================

--- [USED REFERENCE IMAGES] ---
${refLines}

--- [integrated_multimodal_description] ---
${descText}

--- [overall_soundscape] ---
${soundText || 'N/A'}

--- [non_diegetic_music] ---
${musicText || 'N/A'}
================================================================================
`;

  fs.writeFileSync(promptTxtPath, txtContent, 'utf8');

  // 3. Update project.json state
  const state = getProjectState(projectName);
  const padClip = String(clipIndex).padStart(2, '0');
  const clipKey = `clip${padClip}`;
  if (!state.clips[clipKey]) state.clips[clipKey] = {};
  if (!state.clips[clipKey].attempts) state.clips[clipKey].attempts = {};

  const attemptKey = `attempt${attemptIndex}`;
  state.clips[clipKey].attempts[attemptKey] = {
    ...record,
    refFilenames: (record.refImages || []).map(p => path.basename(p)),
    promptJsonPath,
    promptTxtPath
  };

  updateProjectState(projectName, { clips: state.clips });
  return { promptJsonPath, promptTxtPath };
}

export function saveClipReview(projectName, clipIndex, reviewData) {
  const clipDir = getClipDir(projectName, clipIndex);
  const reviewPath = path.join(clipDir, 'review.json');
  fs.writeFileSync(reviewPath, JSON.stringify(reviewData, null, 2), 'utf8');

  // Update in project state
  const state = getProjectState(projectName);
  const padClip = String(clipIndex).padStart(2, '0');
  const clipKey = `clip${padClip}`;
  if (!state.clips[clipKey]) {
    state.clips[clipKey] = {};
  }
  state.clips[clipKey].review = reviewData;
  state.clips[clipKey].verdict = reviewData.verdict;
  state.clips[clipKey].chosenAttempt = reviewData.chosenAttempt;
  return updateProjectState(projectName, { clips: state.clips });
}
