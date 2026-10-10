import { z } from 'zod';
import path from 'node:path';
import fs from 'node:fs';

import {
  initProject,
  getProjectState,
  updateProjectState,
  saveScenario,
  getClipDir,
  saveClipReview,
  getProjectPath
} from './projects.mjs';

import {
  generateKrea2,
  generateQwen21,
  generateH3,
  generateKlein,
  generateZImage,
  generateMusic,
  generateRtx,
  generateUpscale
} from './generators.mjs';

import {
  checkQualityMetrics,
  extractFrameGrid,
  concatClips,
  overlayText
} from './media.mjs';

import { verifyTranscript } from './stt.mjs';
import { sanitizePath } from './security.mjs';

function formatToolResponse(data) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data)
      }
    ]
  };
}

export function registerTools(server) {
  // 1. project_init
  server.tool(
    'project_init',
    'Initialize a new AI Director project directory with standard structure',
    {
      projectName: z.string().describe('Unique project name slug, e.g. drink_ad_01'),
      brief: z.union([z.string(), z.record(z.any())]).describe('User brief summary')
    },
    async ({ projectName, brief }) => {
      const res = initProject(projectName, typeof brief === 'string' ? { description: brief } : brief);
      return formatToolResponse({ ok: true, projectName, projectDir: res.projectDir, stage: 'scenario' });
    }
  );

  // 2. project_status
  server.tool(
    'project_status',
    'Retrieve current project state and progress',
    {
      projectName: z.string().describe('Project name')
    },
    async ({ projectName }) => {
      const state = getProjectState(projectName);
      return formatToolResponse({
        ok: true,
        projectName,
        currentStage: state.currentStage,
        shotsTotal: state.shots?.length || 0,
        clipsStatus: Object.keys(state.clips || {}).map(k => ({
          clip: k,
          verdict: state.clips[k].verdict,
          chosenAttempt: state.clips[k].chosenAttempt
        }))
      });
    }
  );

  // 3. project_save_scenario
  server.tool(
    'project_save_scenario',
    'Save scenario shot list table as the definitive single artifact',
    {
      projectName: z.string(),
      shots: z.array(z.object({
        shotIndex: z.number(),
        purpose: z.string(),
        durationSeconds: z.number().min(3).max(10),
        durationReason: z.string(),
        scenePrompt: z.string(),
        refImages: z.array(z.string()).optional(),
        speech: z.string().optional(),
        music: z.boolean().optional()
      }))
    },
    async ({ projectName, shots }) => {
      saveScenario(projectName, { shots });
      return formatToolResponse({ ok: true, shotsCount: shots.length, stage: 'production' });
    }
  );

  // 4. generate_image_krea2
  server.tool(
    'generate_image_krea2',
    'Generate reference image using Krea2 model',
    {
      projectName: z.string(),
      prompt: z.string(),
      mode: z.enum(['t2i', 'i2i', 'identity']).default('t2i'),
      width: z.number().default(1024),
      height: z.number().default(1024),
      refImage: z.string().optional(),
      dryRun: z.boolean().default(false)
    },
    async ({ projectName, prompt, mode, width, height, refImage, dryRun }) => {
      const projDir = getProjectPath(projectName);
      const refsDir = path.join(projDir, 'refs');
      const job = {
        mode,
        prompt,
        width,
        height,
        ...(refImage ? { i2iImage: sanitizePath(refImage, projectName) } : {})
      };

      const res = await generateKrea2(job, { dryRun, outDir: refsDir });
      if (!res.ok) {
        return formatToolResponse({ ok: false, error: res.error, stage: res.stage });
      }

      return formatToolResponse({
        ok: true,
        path: res.localFiles?.[0] || res.outputs?.[0]?.url || 'dry_run_ok',
        seed: res.seed,
        dryRun
      });
    }
  );

  // 5. generate_image_qwen21
  server.tool(
    'generate_image_qwen21',
    'Generate reference image using Qwen Image 2.1 model',
    {
      projectName: z.string(),
      prompt: z.string(),
      mode: z.enum(['t2i', 'i2i', 'ref2i', 'edit', 'pose']).default('t2i'),
      width: z.number().default(1024),
      height: z.number().default(1024),
      refImages: z.array(z.string()).optional(),
      dryRun: z.boolean().default(false)
    },
    async ({ projectName, prompt, mode, width, height, refImages, dryRun }) => {
      const projDir = getProjectPath(projectName);
      const refsDir = path.join(projDir, 'refs');
      const job = {
        mode,
        prompt,
        width,
        height,
        ...(refImages ? { refImages: refImages.map(p => sanitizePath(p, projectName)) } : {})
      };

      const res = await generateQwen21(job, { dryRun, outDir: refsDir });
      if (!res.ok) {
        return formatToolResponse({ ok: false, error: res.error, stage: res.stage });
      }

      return formatToolResponse({
        ok: true,
        path: res.localFiles?.[0] || res.outputs?.[0]?.url || 'dry_run_ok',
        seed: res.seed,
        dryRun
      });
    }
  );

  // 6. generate_image_zimage
  server.tool(
    'generate_image_zimage',
    'Generate image using Z-Image Turbo',
    {
      projectName: z.string(),
      prompt: z.string(),
      width: z.number().default(1024),
      height: z.number().default(1024),
      steps: z.number().default(8),
      dryRun: z.boolean().default(false)
    },
    async ({ projectName, prompt, width, height, steps, dryRun }) => {
      const projDir = getProjectPath(projectName);
      const refsDir = path.join(projDir, 'refs');
      const job = { mode: 't2i', prompt, width, height, steps };

      const res = await generateZImage(job, { dryRun, outDir: refsDir });
      if (!res.ok) {
        return formatToolResponse({ ok: false, error: res.error, stage: res.stage });
      }

      return formatToolResponse({
        ok: true,
        path: res.localFiles?.[0] || res.outputs?.[0]?.url || 'dry_run_ok',
        seed: res.seed,
        dryRun
      });
    }
  );

  // 7. generate_image_klein
  server.tool(
    'generate_image_klein',
    'Generate or edit image using Flux2 Klein',
    {
      projectName: z.string(),
      mode: z.enum(['t2i', 'i2i', 'edit', 'faceswap']).default('t2i'),
      prompt: z.string(),
      width: z.number().default(1024),
      height: z.number().default(1024),
      dryRun: z.boolean().default(false)
    },
    async ({ projectName, mode, prompt, width, height, dryRun }) => {
      const projDir = getProjectPath(projectName);
      const refsDir = path.join(projDir, 'refs');
      const job = { mode, prompt, width, height };

      const res = await generateKlein(job, { dryRun, outDir: refsDir });
      if (!res.ok) {
        return formatToolResponse({ ok: false, error: res.error, stage: res.stage });
      }

      return formatToolResponse({
        ok: true,
        path: res.localFiles?.[0] || res.outputs?.[0]?.url || 'dry_run_ok',
        seed: res.seed,
        dryRun
      });
    }
  );

  // 8. generate_image_upscale
  server.tool(
    'generate_image_upscale',
    'Upscale still image using SeedVR2',
    {
      projectName: z.string(),
      imagePath: z.string(),
      resolution: z.number().default(2048),
      dryRun: z.boolean().default(false)
    },
    async ({ projectName, imagePath, resolution, dryRun }) => {
      const cleanPath = sanitizePath(imagePath, projectName);
      const projDir = getProjectPath(projectName);
      const refsDir = path.join(projDir, 'refs');
      const job = { image: cleanPath, resolution };

      const res = await generateUpscale(job, { dryRun, outDir: refsDir });
      if (!res.ok) {
        return formatToolResponse({ ok: false, error: res.error, stage: res.stage });
      }

      return formatToolResponse({
        ok: true,
        path: res.localFiles?.[0] || 'dry_run_ok',
        dryRun
      });
    }
  );

  // 9. generate_video_h3
  server.tool(
    'generate_video_h3',
    'Generate video clip using MiniMax H3 (7+1 default: 0.5MP -> 1.6MP latent upscale, 10s)',
    {
      projectName: z.string(),
      clipIndex: z.number(),
      attemptIndex: z.number().default(1),
      mode: z.enum(['ref2va', 'fl2va', 'l2va', 't2va']).default('ref2va'),
      prompt: z.union([
        z.string(),
        z.object({
          integrated_multimodal_description: z.string(),
          overall_soundscape: z.string().optional(),
          non_diegetic_music: z.string().optional()
        })
      ]),
      refImages: z.array(z.string()).optional(),
      firstFrame: z.string().optional(),
      lastFrame: z.string().optional(),
      durationSeconds: z.number().min(3).max(10).default(10),
      aspect: z.string().default('16:9 Landscape'),
      dryRun: z.boolean().default(false)
    },
    async ({
      projectName,
      clipIndex,
      attemptIndex,
      mode,
      prompt,
      refImages,
      firstFrame,
      lastFrame,
      durationSeconds,
      aspect,
      dryRun
    }) => {
      const attemptDir = getClipDir(projectName, clipIndex, attemptIndex);

      const job = {
        mode,
        prompt,
        durationSeconds,
        aspect,
        ...(refImages ? { refImages: refImages.map(p => sanitizePath(p, projectName)) } : {}),
        ...(firstFrame ? { firstFrame: sanitizePath(firstFrame, projectName) } : {}),
        ...(lastFrame ? { lastFrame: sanitizePath(lastFrame, projectName) } : {})
      };

      const res = await generateH3(job, { dryRun, outDir: attemptDir });
      if (!res.ok) {
        return formatToolResponse({ ok: false, error: res.error, stage: res.stage });
      }

      const videoFile = res.localFiles?.find(f => f.endsWith('.mp4')) || res.localFiles?.[0] || 'dry_run_ok';

      // Record prompt and used reference filenames as files
      const refList = (refImages || []).map((refPath, idx) => {
        const clean = sanitizePath(refPath, projectName);
        return {
          index: idx + 1,
          label: `<Picture ${idx + 1}>`,
          filename: path.basename(clean),
          fullPath: clean
        };
      });

      const pObj = typeof prompt === 'string' ? { integrated_multimodal_description: prompt } : prompt;
      const promptRecord = {
        projectName,
        clipIndex,
        attemptIndex,
        mode,
        durationSeconds,
        aspect,
        references: refList,
        prompt: pObj,
        firstFrame: firstFrame ? path.basename(firstFrame) : null,
        lastFrame: lastFrame ? path.basename(lastFrame) : null,
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
Project:   ${projectName}
Clip:      Shot ${clipIndex} (Attempt ${attemptIndex})
Duration:  ${durationSeconds}s | Mode: ${mode} | Aspect: ${aspect}
Seed:      ${res.seed || 'random'}
Timestamp: ${promptRecord.timestamp}

--------------------------------------------------------------------------------
1. USED REFERENCE IMAGES
--------------------------------------------------------------------------------
${refLines}

--------------------------------------------------------------------------------
2. INTEGRATED MULTIMODAL DESCRIPTION (Visuals, Camera & Spoken Voice)
--------------------------------------------------------------------------------
${pObj.integrated_multimodal_description || pObj.prompt || ''}

--------------------------------------------------------------------------------
3. OVERALL SOUNDSCAPE (Foley & Ambience)
--------------------------------------------------------------------------------
${pObj.overall_soundscape || 'N/A'}

--------------------------------------------------------------------------------
4. NON-DIEGETIC MUSIC (BGM)
--------------------------------------------------------------------------------
${pObj.non_diegetic_music || 'N/A'}
================================================================================
`;
        fs.writeFileSync(path.join(attemptDir, 'prompt.txt'), promptText, 'utf8');
      } catch (err) {
        console.error('Error saving prompt record files:', err);
      }

      return formatToolResponse({
        ok: true,
        videoPath: videoFile,
        durationSeconds,
        seed: res.seed,
        dryRun
      });
    }
  );

  // 10. generate_video_rtx
  server.tool(
    'generate_video_rtx',
    'Upscale or deblur video clip using RTX VSR',
    {
      projectName: z.string(),
      videoPath: z.string(),
      op: z.enum(['upscale', 'deblur', 'both']).default('upscale'),
      scale: z.number().default(2.0),
      quality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'ULTRA']).default('HIGH'),
      dryRun: z.boolean().default(false)
    },
    async ({ projectName, videoPath, op, scale, quality, dryRun }) => {
      const cleanPath = sanitizePath(videoPath, projectName);
      const projDir = getProjectPath(projectName);
      const outDir = path.join(projDir, 'final');
      const job = { op, video: cleanPath, scale, quality };

      const res = await generateRtx(job, { dryRun, outDir });
      if (!res.ok) {
        return formatToolResponse({ ok: false, error: res.error, stage: res.stage });
      }

      return formatToolResponse({
        ok: true,
        videoPath: res.localFiles?.[0] || 'dry_run_ok',
        dryRun
      });
    }
  );

  // 11. generate_music
  server.tool(
    'generate_music',
    'Generate music or instrumental soundtrack via MusicMaker (acestep / minimax)',
    {
      projectName: z.string(),
      engine: z.enum(['acestep', 'minimax']).default('minimax'),
      caption: z.string(),
      lyrics: z.string().optional(),
      duration: z.number().default(30),
      instrumental: z.boolean().default(true),
      title: z.string().default('Soundtrack'),
      dryRun: z.boolean().default(false)
    },
    async ({ projectName, engine, caption, lyrics, duration, instrumental, title, dryRun }) => {
      const projDir = getProjectPath(projectName);
      const audioDir = path.join(projDir, 'audio');
      const job = { engine, caption, lyrics, duration, instrumental, title };

      const res = await generateMusic(job, { dryRun, outDir: audioDir });
      if (!res.ok) {
        return formatToolResponse({ ok: false, error: res.error, stage: res.stage });
      }

      return formatToolResponse({
        ok: true,
        audioPath: res.localFiles?.[0] || 'dry_run_ok',
        dryRun
      });
    }
  );

  // 12. media_quality_check
  server.tool(
    'media_quality_check',
    'Cheap numeric check for resolution, duration, freeze, and blackouts',
    {
      projectName: z.string(),
      videoPath: z.string(),
      expectedDuration: z.number().optional()
    },
    async ({ projectName, videoPath, expectedDuration }) => {
      const cleanPath = sanitizePath(videoPath, projectName);
      const res = await checkQualityMetrics(cleanPath, expectedDuration);
      return formatToolResponse({
        ok: true,
        pass: res.pass,
        instantFailReason: res.instantFailReason,
        resolution: `${res.metrics.width}x${res.metrics.height}`,
        duration: res.metrics.duration,
        hasAudio: res.metrics.hasAudio
      });
    }
  );

  // 13. media_extract_grid
  server.tool(
    'media_extract_grid',
    'Extract representative frames and tile into ONE lightweight grid image for visual review',
    {
      projectName: z.string(),
      videoPath: z.string(),
      clipIndex: z.number(),
      attemptIndex: z.number().default(1),
      frameCount: z.number().default(4),
      gridCols: z.number().default(2)
    },
    async ({ projectName, videoPath, clipIndex, attemptIndex, frameCount, gridCols }) => {
      const cleanPath = sanitizePath(videoPath, projectName);
      const attemptDir = getClipDir(projectName, clipIndex, attemptIndex);
      const outGridPath = path.join(attemptDir, 'grid.jpg');

      const res = await extractFrameGrid(cleanPath, outGridPath, frameCount, gridCols);
      return formatToolResponse({
        ok: true,
        gridPath: res.gridPath,
        timestamps: res.timestamps,
        duration: res.duration
      });
    }
  );

  // 14. stt_verify
  server.tool(
    'stt_verify',
    'Transcribe video audio using Whisper and verify script adherence',
    {
      projectName: z.string(),
      videoPath: z.string(),
      expectedScript: z.string()
    },
    async ({ projectName, videoPath, expectedScript }) => {
      const cleanPath = sanitizePath(videoPath, projectName);
      const res = await verifyTranscript(cleanPath, expectedScript);
      return formatToolResponse({
        ok: true,
        match: res.match,
        similarity: res.similarity,
        transcript: res.transcript,
        failReason: res.failReason
      });
    }
  );

  // 15. record_review_verdict
  server.tool(
    'record_review_verdict',
    'Record one-look review verdict (PASS/FAIL/ADOPT) + one-line reason',
    {
      projectName: z.string(),
      clipIndex: z.number(),
      attemptIndex: z.number(),
      verdict: z.enum(['PASS', 'FAIL', 'ADOPT']),
      failReason: z.string().optional(),
      scores: z.object({
        adherence: z.number().min(0).max(2),
        naturalness: z.number().min(0).max(2),
        continuity: z.number().min(0).max(2),
        audio: z.number().min(0).max(2),
        aesthetic: z.number().min(0).max(2)
      }),
      gridPath: z.string().optional()
    },
    async ({ projectName, clipIndex, attemptIndex, verdict, failReason, scores, gridPath }) => {
      const totalScore = scores.adherence + scores.naturalness + scores.continuity + scores.audio + scores.aesthetic;
      const reviewData = {
        clipIndex,
        attemptIndex,
        verdict,
        failReason: verdict === 'PASS' ? null : (failReason || 'Score cutoff not met'),
        totalScore,
        scores,
        gridPath: gridPath ? sanitizePath(gridPath, projectName) : null,
        chosenAttempt: attemptIndex,
        timestamp: new Date().toISOString()
      };

      saveClipReview(projectName, clipIndex, reviewData);

      let nextAction = 'next_clip';
      if (verdict === 'FAIL') {
        nextAction = attemptIndex < 3 ? 'regenerate' : 'adopt_best';
      }

      return formatToolResponse({
        ok: true,
        clipIndex,
        verdict,
        totalScore,
        nextAction
      });
    }
  );

  // 16. media_concat_clips
  server.tool(
    'media_concat_clips',
    'Stitch passed video clips together into a single final video',
    {
      projectName: z.string(),
      clipPaths: z.array(z.string()),
      outputFileName: z.string().default('stitched.mp4')
    },
    async ({ projectName, clipPaths, outputFileName }) => {
      const projDir = getProjectPath(projectName);
      const outPath = path.join(projDir, 'final', outputFileName);
      const cleanClips = clipPaths.map(p => sanitizePath(p, projectName));

      const res = await concatClips(cleanClips, outPath);
      return formatToolResponse({
        ok: true,
        outputPath: res.outPath,
        duration: res.duration
      });
    }
  );

  // 17. media_text_overlay
  server.tool(
    'media_text_overlay',
    'Overlay Korean subtitles/typography using FFmpeg',
    {
      projectName: z.string(),
      videoPath: z.string(),
      textItems: z.array(z.object({
        text: z.string(),
        startTime: z.number().optional(),
        endTime: z.number().optional(),
        fontSize: z.number().optional(),
        fontColor: z.string().optional(),
        position: z.enum(['bottom', 'top', 'center']).optional()
      })),
      outputFileName: z.string().default('final.mp4')
    },
    async ({ projectName, videoPath, textItems, outputFileName }) => {
      const cleanPath = sanitizePath(videoPath, projectName);
      const projDir = getProjectPath(projectName);
      const outPath = path.join(projDir, 'final', outputFileName);

      const res = await overlayText(cleanPath, textItems, outPath);
      updateProjectState(projectName, { finalVideo: res.outPath, currentStage: 'reporting' });

      return formatToolResponse({
        ok: true,
        outputPath: res.outPath
      });
    }
  );

  // 18. project_save_report
  server.tool(
    'project_save_report',
    'Save final markdown report and mark project completed',
    {
      projectName: z.string(),
      reportMarkdown: z.string()
    },
    async ({ projectName, reportMarkdown }) => {
      const projDir = getProjectPath(projectName);
      const reportPath = path.join(projDir, 'report.md');
      fs.writeFileSync(reportPath, reportMarkdown, 'utf8');

      updateProjectState(projectName, { status: 'completed', report: reportPath, currentStage: 'completed' });
      return formatToolResponse({ ok: true, reportPath });
    }
  );
}
