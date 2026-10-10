import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { config } from './config.mjs';

const execFileAsync = promisify(execFile);

function normalizeKorean(str) {
  if (!str) return '';
  return str
    .replace(/[^\uAC00-\uD7A30-9a-zA-Z]/g, '')
    .toLowerCase();
}

function calculateSimilarity(str1, str2) {
  const s1 = normalizeKorean(str1);
  const s2 = normalizeKorean(str2);

  if (!s1 && !s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) {
    return Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
  }

  // Levenshtein distance
  const matrix = Array.from({ length: s1.length + 1 }, () =>
    new Array(s2.length + 1).fill(0)
  );

  for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const dist = matrix[s1.length][s2.length];
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - dist / maxLen;
}

export async function transcribeAudio(audioOrVideoPath, modelName = 'base') {
  const scriptPath = path.resolve(config.rootDir, 'src', 'whisper_transcribe.py');
  const args = [scriptPath, audioOrVideoPath, modelName];

  try {
    const { stdout } = await execFileAsync(config.pythonEmbeded, args);
    const result = JSON.parse(stdout.trim());
    return result;
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function verifyTranscript(audioOrVideoPath, expectedScript, minSimilarity = 0.65) {
  const trans = await transcribeAudio(audioOrVideoPath);
  if (!trans.ok) {
    return {
      ok: false,
      match: false,
      error: trans.error,
      transcript: null,
      expected: expectedScript,
      similarity: 0
    };
  }

  const sim = calculateSimilarity(trans.text, expectedScript);
  const match = sim >= minSimilarity;

  return {
    ok: true,
    match,
    similarity: Math.round(sim * 100) / 100,
    transcript: trans.text,
    expected: expectedScript,
    failReason: match ? null : `Transcript differs from script (similarity ${(sim * 100).toFixed(0)}% < ${(minSimilarity * 100).toFixed(0)}%)`
  };
}
