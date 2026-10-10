import fs from 'node:fs';
import { config } from './config.mjs';
import { gpuLock } from './security.mjs';

import { generate as runH3 } from '../headless/h3-headless/index.mjs';
import { generate as runKrea2 } from '../headless/krea2-headless/index.mjs';
import { generate as runQwen21 } from '../headless/qwen21-headless/index.mjs';
import { generate as runZImage } from '../headless/zimage-headless/index.mjs';
import { generate as runKlein } from '../headless/klein-headless/index.mjs';
import { generate as runRtx } from '../headless/video-rtx-headless/index.mjs';
import { generate as runMusic } from '../headless/music-headless/index.mjs';
import { generate as runUpscale } from '../headless/upscale-headless/index.mjs';

function getComfyConfig() {
  if (fs.existsSync(config.comfyConfigPath)) {
    return JSON.parse(fs.readFileSync(config.comfyConfigPath, 'utf8'));
  }
  return {
    baseUrl: 'http://127.0.0.1:8188',
    timeoutMs: 1800000
  };
}

/**
 * Generate image via Krea2 (t2i, i2i, identity)
 */
export async function generateKrea2(job, opts = {}) {
  const comfy = getComfyConfig();
  return gpuLock.runExclusive(async () => {
    return await runKrea2(job, comfy, opts);
  });
}

/**
 * Generate image via Qwen 2.1 (t2i, i2i, ref2i, edit, pose)
 */
export async function generateQwen21(job, opts = {}) {
  const comfy = getComfyConfig();
  return gpuLock.runExclusive(async () => {
    return await runQwen21(job, comfy, opts);
  });
}

/**
 * Generate video via MiniMax H3 (ref2va, fl2va, l2va, t2va, onetake)
 * Defaults to 7+1 (PDD 8-step turbo, 0.5 MP -> 1.6 MP latent upscale, 10s duration)
 */
export async function generateH3(job, opts = {}) {
  const comfy = getComfyConfig();

  // Apply default 7+1 configuration if not overridden
  const fullJob = {
    mode: job.mode || 'ref2va',
    durationSeconds: job.durationSeconds || 10,
    aspect: job.aspect || '16:9 Landscape',
    turboMode: job.turboMode || 'pdd',
    pddNfe: job.pddNfe || '8',
    hiresFinish: job.hiresFinish !== undefined ? job.hiresFinish : true,
    hiresStartMp: job.hiresStartMp !== undefined ? job.hiresStartMp : 0.5,
    hiresFinalMp: job.hiresFinalMp !== undefined ? job.hiresFinalMp : 1.6,
    ...job
  };

  return gpuLock.runExclusive(async () => {
    return await runH3(fullJob, comfy, opts);
  });
}

/**
 * Restore smudged/small faces via H3 Face Refine
 */
export async function generateFaceRefine(job, opts = {}) {
  const comfy = getComfyConfig();
  const fullJob = {
    mode: 'facerefine',
    faceDetector: job.faceDetector || 'face_yolov8m.pt',
    frDenoise: job.denoise !== undefined ? job.denoise : (job.frDenoise ?? 0.40),
    ...job
  };

  return gpuLock.runExclusive(async () => {
    return await runH3(fullJob, comfy, opts);
  });
}

/**
 * Generate image via Z-Image
 */
export async function generateZImage(job, opts = {}) {
  const comfy = getComfyConfig();
  return gpuLock.runExclusive(async () => {
    return await runZImage(job, comfy, opts);
  });
}

/**
 * Generate image via Flux2 Klein
 */
export async function generateKlein(job, opts = {}) {
  const comfy = getComfyConfig();
  return gpuLock.runExclusive(async () => {
    return await runKlein(job, comfy, opts);
  });
}

/**
 * Upscale/deblur video via RTX VSR
 */
export async function generateRtx(job, opts = {}) {
  const comfy = getComfyConfig();
  return gpuLock.runExclusive(async () => {
    return await runRtx(job, comfy, opts);
  });
}

/**
 * Generate song/instrumental via MusicMaker
 */
export async function generateMusic(job, opts = {}) {
  const comfy = getComfyConfig();
  return gpuLock.runExclusive(async () => {
    return await runMusic(job, comfy, opts);
  });
}

/**
 * Upscale image via SeedVR2
 */
export async function generateUpscale(job, opts = {}) {
  const comfy = getComfyConfig();
  return gpuLock.runExclusive(async () => {
    return await runUpscale(job, comfy, opts);
  });
}
