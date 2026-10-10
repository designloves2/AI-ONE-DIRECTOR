import { initProject, getClipDir } from '../src/projects.mjs';
import { generateH3 } from '../src/generators.mjs';
import fs from 'node:fs';
import path from 'node:path';

async function testPromptSave() {
  const projName = 'test_prompt_record_' + Date.now();
  const init = initProject(projName, { brief: 'Test prompt recording' });
  const attemptDir = getClipDir(projName, 1, 1);

  // Write a dummy ref image
  const dummyRef = path.join(init.projectDir, 'refs', 'sample_product.png');
  fs.writeFileSync(dummyRef, 'fake_png_data');

  const job = {
    mode: 'ref2va',
    durationSeconds: 5,
    prompt: {
      integrated_multimodal_description: 'A close up of <Picture 1> sample product. A narrator (S1) says in an off-screen voiceover: <d>[Korean] 신선함을 담았습니다.</d> while lips remain closed.',
      overall_soundscape: 'Crisp fizz sound, subtle wooden rustle',
      non_diegetic_music: 'Acoustic guitar melody at moderate tempo'
    },
    refImages: [dummyRef]
  };

  const promptRecord = {
    projectName: projName,
    clipIndex: 1,
    attemptIndex: 1,
    mode: job.mode,
    durationSeconds: job.durationSeconds,
    references: [{ label: '<Picture 1>', filename: 'sample_product.png', fullPath: dummyRef }],
    prompt: job.prompt,
    seed: 123456,
    videoPath: 'dry_run_video.mp4',
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(path.join(attemptDir, 'prompt.json'), JSON.stringify(promptRecord, null, 2), 'utf8');

  const promptText = `================================================================================
CLIP PROMPT & REFERENCE SPECIFICATION
================================================================================
Project:   ${projName}
Clip:      Shot 1 (Attempt 1)
Duration:  5s | Mode: ref2va
Seed:      123456

--- [USED REFERENCE IMAGES] ---
  <Picture 1>: sample_product.png (${dummyRef})

--- [integrated_multimodal_description] ---
${job.prompt.integrated_multimodal_description}

--- [overall_soundscape] ---
${job.prompt.overall_soundscape}

--- [non_diegetic_music] ---
${job.prompt.non_diegetic_music}
================================================================================
`;
  fs.writeFileSync(path.join(attemptDir, 'prompt.txt'), promptText, 'utf8');

  console.log('Files created:');
  console.log('prompt.json exists:', fs.existsSync(path.join(attemptDir, 'prompt.json')));
  console.log('prompt.txt exists:', fs.existsSync(path.join(attemptDir, 'prompt.txt')));
  console.log('\n--- prompt.txt preview ---');
  console.log(fs.readFileSync(path.join(attemptDir, 'prompt.txt'), 'utf8'));

  // Clean up
  fs.rmSync(init.projectDir, { recursive: true, force: true });
}

testPromptSave().catch(console.error);
