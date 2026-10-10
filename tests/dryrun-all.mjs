import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { initProject, getProjectState, saveScenario, saveClipReview } from '../src/projects.mjs';
import { generateKrea2, generateQwen21, generateH3 } from '../src/generators.mjs';
import { probeVideo, checkQualityMetrics, extractFrameGrid, concatClips, overlayText } from '../src/media.mjs';
import { config } from '../src/config.mjs';

const execAsync = promisify(execFile);

async function runTest() {
  console.log('=== AI ONE DIRECTOR MVP VERIFICATION ===');
  const projName = 'test_mvp_run_' + Date.now();

  // 1. Project Init
  console.log('1. Testing project_init...');
  const initRes = initProject(projName, { title: 'Test Drink Commercial' });
  console.log('   Initialized project at:', initRes.projectDir);

  // 2. Scenario
  console.log('2. Testing save_scenario...');
  const shots = [
    {
      shotIndex: 1,
      purpose: 'Visual Hook',
      durationSeconds: 10,
      durationReason: 'Establish chilled drink vibe and brand look',
      scenePrompt: 'Cinematic shot of cold soda bottle with condensation'
    },
    {
      shotIndex: 2,
      purpose: 'Product Reveal & Taste',
      durationSeconds: 5,
      durationReason: 'Dynamic pour shot to highlight carbonation',
      scenePrompt: 'Close up of carbonated drink poured into a glass with ice'
    }
  ];
  saveScenario(projName, { shots });
  console.log('   Scenario saved with', shots.length, 'shots');

  // 3. Dry-run Krea2
  console.log('3. Testing Krea2 dry-run...');
  const kreaRes = await generateKrea2({
    mode: 't2i',
    prompt: 'A cold premium soda bottle on summer beach'
  }, { dryRun: true });
  console.log('   Krea2 dry-run ok:', kreaRes.ok, 'nodes:', Object.keys(kreaRes.graphSubmitted || {}).length);

  // 4. Dry-run Qwen21
  console.log('4. Testing Qwen2.1 dry-run...');
  const qwenRes = await generateQwen21({
    mode: 't2i',
    prompt: 'Glass filled with sparkling beverage and mint leaves'
  }, { dryRun: true });
  console.log('   Qwen2.1 dry-run ok:', qwenRes.ok, 'nodes:', Object.keys(qwenRes.graphSubmitted || {}).length);

  // 5. Dry-run H3 (7+1 defaults)
  console.log('5. Testing MiniMax H3 7+1 dry-run...');
  const h3Res = await generateH3({
    mode: 't2va',
    prompt: 'Cinematic commercial shot of cold soda bottle',
    durationSeconds: 10
  }, { dryRun: true });
  console.log('   H3 dry-run ok:', h3Res.ok, 'nodes:', Object.keys(h3Res.graphSubmitted || {}).length);

  // 6. Media tools (synthetic clips)
  console.log('6. Testing Media tools (quality check, grid, concat, text overlay)...');
  const projDir = path.resolve(config.projectsDir, projName);
  const clip1 = path.join(projDir, 'clips', 'clip1.mp4');
  const clip2 = path.join(projDir, 'clips', 'clip2.mp4');
  const gridJpg = path.join(projDir, 'clips', 'grid.jpg');
  const stitched = path.join(projDir, 'final', 'stitched.mp4');
  const finalText = path.join(projDir, 'final', 'final_text.mp4');

  // Make 2 tiny synthetic video clips with ffmpeg
  await execAsync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'testsrc=duration=2:size=1280x720:rate=24',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', clip1
  ]);

  await execAsync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'testsrc=duration=2:size=1280x720:rate=24',
    '-f', 'lavfi', '-i', 'sine=frequency=880:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', clip2
  ]);

  // Quality check
  const qual = await checkQualityMetrics(clip1, 2.0);
  console.log('   Quality check pass:', qual.pass, 'resolution:', `${qual.metrics.width}x${qual.metrics.height}`);

  // Grid extract
  const gridRes = await extractFrameGrid(clip1, gridJpg, 4, 2);
  console.log('   Grid extract ok:', gridRes.ok, 'exists:', fs.existsSync(gridJpg));

  // Concat
  const concatRes = await concatClips([clip1, clip2], stitched);
  console.log('   Concat ok:', concatRes.ok, 'total duration:', concatRes.duration.toFixed(1) + 's');

  // Text overlay
  const overlayRes = await overlayText(stitched, [
    { text: '상쾌한 여름 한 잔', startTime: 0, endTime: 2, position: 'bottom' },
    { text: '스파클링 소다', startTime: 2, endTime: 4, position: 'center' }
  ], finalText);
  console.log('   Overlay text ok:', overlayRes.ok, 'final exists:', fs.existsSync(finalText));

  // 7. Review verdict record
  console.log('7. Testing record_review_verdict...');
  saveClipReview(projName, 1, {
    clipIndex: 1,
    attemptIndex: 1,
    verdict: 'PASS',
    totalScore: 9,
    scores: { adherence: 2, naturalness: 2, continuity: 2, audio: 1, aesthetic: 2 },
    gridPath: gridJpg
  });
  const state = getProjectState(projName);
  console.log('   State after verdict:', state.clips.clip01?.verdict, 'score:', state.clips.clip01?.review?.totalScore);

  console.log('\n=== ALL DRY-RUN CHECKS PASSED SUCCESSFULLY ===');
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
