import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';

const execFileAsync = promisify(execFile);

/**
 * Probe video metadata using ffprobe
 */
export async function probeVideo(videoPath) {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    videoPath
  ];

  const { stdout } = await execFileAsync(config.ffprobePath, args);
  const data = JSON.parse(stdout);

  const videoStream = data.streams?.find(s => s.codec_type === 'video');
  const audioStream = data.streams?.find(s => s.codec_type === 'audio');

  if (!videoStream) {
    throw new Error(`No video stream found in: ${videoPath}`);
  }

  let fps = 24;
  if (videoStream.avg_frame_rate) {
    const [num, den] = videoStream.avg_frame_rate.split('/').map(Number);
    if (den && den > 0) fps = Math.round(num / den);
  }

  const duration = parseFloat(data.format?.duration || videoStream.duration || '0');

  return {
    width: videoStream.width,
    height: videoStream.height,
    duration,
    fps,
    nbFrames: parseInt(videoStream.nb_frames || '0', 10),
    videoCodec: videoStream.codec_name,
    hasAudio: !!audioStream,
    audioCodec: audioStream?.codec_name || null
  };
}

/**
 * Compute numeric quality metrics and check instant-fail thresholds
 */
export async function checkQualityMetrics(videoPath, expectedDuration = null) {
  const probe = await probeVideo(videoPath);

  // 1. Resolution check
  if (probe.width < 512 || probe.height < 512) {
    return {
      pass: false,
      instantFailReason: `Resolution too low: ${probe.width}x${probe.height} (minimum 512x512)`,
      metrics: probe
    };
  }

  // 2. Duration check
  if (expectedDuration !== null) {
    const diff = Math.abs(probe.duration - expectedDuration);
    if (diff > Math.max(2.0, expectedDuration * 0.3)) {
      return {
        pass: false,
        instantFailReason: `Duration mismatch: expected ${expectedDuration}s, got ${probe.duration.toFixed(1)}s (diff ${diff.toFixed(1)}s)`,
        metrics: probe
      };
    }
  }

  // 3. Freeze frames & black frames detection
  let freezeDetected = false;
  let blackDetected = false;
  try {
    const checkArgs = [
      '-i', videoPath,
      '-vf', 'freezedetect=n=0.003:d=2.0,blackdetect=d=1.5:pic_th=0.98',
      '-f', 'null',
      '-'
    ];
    const { stderr } = await execFileAsync(config.ffmpegPath, checkArgs);
    if (stderr.includes('freeze_start')) freezeDetected = true;
    if (stderr.includes('black_start')) blackDetected = true;
  } catch (err) {
    // Non-fatal if filter fails
  }

  if (freezeDetected) {
    return {
      pass: false,
      instantFailReason: 'Excessive frozen frames detected (>2.0s freeze)',
      metrics: { ...probe, freezeDetected: true }
    };
  }

  if (blackDetected) {
    return {
      pass: false,
      instantFailReason: 'Excessive black frames detected (>1.5s blackout)',
      metrics: { ...probe, blackDetected: true }
    };
  }

  return {
    pass: true,
    instantFailReason: null,
    metrics: {
      ...probe,
      freezeDetected: false,
      blackDetected: false
    }
  };
}

/**
 * Extract frame grid (one lightweight JPG image containing N frames)
 */
export async function extractFrameGrid(videoPath, outGridPath, count = 4, cols = 2) {
  const probe = await probeVideo(videoPath);
  const duration = probe.duration;
  if (duration <= 0) throw new Error('Video has zero duration');

  const outDir = path.dirname(outGridPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Calculate timestamps
  const timestamps = [];
  for (let i = 1; i <= count; i++) {
    const t = (duration * i) / (count + 1);
    timestamps.push(t);
  }

  // Extract individual frames to temp files
  const tempFrames = [];
  try {
    for (let i = 0; i < count; i++) {
      const tempFramePath = path.join(outDir, `_tmp_frame_${i}_${Date.now()}.jpg`);
      tempFrames.push(tempFramePath);
      const args = [
        '-y',
        '-ss', timestamps[i].toFixed(2),
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '3',
        tempFramePath
      ];
      await execFileAsync(config.ffmpegPath, args);
    }

    // Tile frames into a grid
    // For count=4, cols=2: 2x2 grid
    let filterGraph = '';
    const inputArgs = [];
    for (let i = 0; i < count; i++) {
      inputArgs.push('-i', tempFrames[i]);
    }

    if (count === 4 && cols === 2) {
      filterGraph = '[0:v][1:v]hstack=inputs=2[top];[2:v][3:v]hstack=inputs=2[bot];[top][bot]vstack=inputs=2,scale=1280:720[out]';
    } else if (count === 6 && cols === 3) {
      filterGraph = '[0:v][1:v][2:v]hstack=inputs=3[top];[3:v][4:v][5:v]hstack=inputs=3[bot];[top][bot]vstack=inputs=2,scale=1440:810[out]';
    } else {
      // General grid: scale every frame to one width (keeps aspect, so portrait works), hstack rows, vstack rows
      const w = Math.floor(1600 / cols / 2) * 2;
      const rows = Math.ceil(count / cols);
      const parts = [];
      for (let i = 0; i < count; i++) parts.push(`[${i}:v]scale=${w}:-2[s${i}]`);
      const rowLabels = [];
      for (let r = 0; r < rows; r++) {
        const idx = Array.from({ length: cols }, (_, c) => Math.min(r * cols + c, count - 1));
        parts.push(`${idx.map((i) => `[s${i}]`).join('')}hstack=inputs=${cols}[r${r}]`);
        rowLabels.push(`[r${r}]`);
      }
      parts.push(rows > 1 ? `${rowLabels.join('')}vstack=inputs=${rows}[out]` : '[r0]null[out]');
      filterGraph = parts.join(';');
    }

    const tileArgs = [
      '-y',
      ...inputArgs,
      '-filter_complex', filterGraph,
      '-map', '[out]',
      '-q:v', '3',
      outGridPath
    ];

    await execFileAsync(config.ffmpegPath, tileArgs);

    return {
      ok: true,
      gridPath: outGridPath,
      timestamps,
      duration,
      count
    };
  } finally {
    // Cleanup temporary frame files
    for (const f of tempFrames) {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch (_) {}
      }
    }
  }
}

/**
 * Concat multiple video clips into one final video
 */
export async function concatClips(clipPaths, outPath) {
  if (!clipPaths || clipPaths.length === 0) {
    throw new Error('No clip paths provided for concatenation');
  }

  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Build filter_complex concat
  const inputArgs = [];
  let filterInputs = '';
  for (let i = 0; i < clipPaths.length; i++) {
    inputArgs.push('-i', clipPaths[i]);
    filterInputs += `[${i}:v:0][${i}:a:0]`;
  }

  const filterGraph = `${filterInputs}concat=n=${clipPaths.length}:v=1:a=1[outv][outa]`;

  const args = [
    '-y',
    ...inputArgs,
    '-filter_complex', filterGraph,
    '-map', '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    outPath
  ];

  await execFileAsync(config.ffmpegPath, args);
  const probe = await probeVideo(outPath);

  return {
    ok: true,
    outPath,
    duration: probe.duration,
    width: probe.width,
    height: probe.height
  };
}

/**
 * Overlay Korean typography / text onto video
 */
export async function overlayText(videoPath, textItems, outPath) {
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Drawtext filters
  const drawtextFilters = textItems.map(item => {
    const text = (item.text || '').replace(/'/g, "\\'").replace(/:/g, '\\:');
    const start = item.startTime ?? 0;
    const end = item.endTime ?? 999;
    const fontSize = item.fontSize || 42;
    const fontColor = item.fontColor || 'white';
    const fontFile = '/Windows/Fonts/malgun.ttf';

    let x = '(w-text_w)/2';
    let y = 'h-text_h-100';
    if (item.position === 'top') y = '100';
    if (item.position === 'center') y = '(h-text_h)/2';

    return `drawtext=fontfile=${fontFile}:text='${text}':fontcolor=${fontColor}:fontsize=${fontSize}:box=1:boxcolor=black@0.5:boxborderw=10:x=${x}:y=${y}:enable='between(t\\,${start}\\,${end})'`;
  }).join(',');

  const args = [
    '-y',
    '-i', videoPath,
    '-vf', drawtextFilters,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    outPath
  ];

  await execFileAsync(config.ffmpegPath, args);
  return { ok: true, outPath };
}
