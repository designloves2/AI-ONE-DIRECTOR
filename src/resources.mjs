import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';

function serveFileResource(server, id, uriString, relativePath, mimeType = 'text/markdown') {
  server.resource(id, uriString, async (uri) => {
    const filePath = path.join(config.rootDir, relativePath);
    const text = fs.readFileSync(filePath, 'utf8');
    return {
      contents: [{
        uri: uri.href,
        text,
        mimeType
      }]
    };
  });
}

export function registerResources(server) {
  // 1. Director Core Rules
  serveFileResource(server, 'director-core', 'director://skills/core', 'skills/director-core.md');

  // 2. Canonical Prompt Rules Summary
  serveFileResource(server, 'prompt-rules', 'director://skills/prompts', 'skills/prompt-rules.md');

  // 3. Official Prompt Guides (from ComfyUI-Prompt-Studio)
  serveFileResource(server, 'prompt-guide-krea2', 'director://skills/prompts/krea2', 'skills/prompt_guides/krea_2/t2i.md');
  serveFileResource(server, 'prompt-guide-h3-base', 'director://skills/prompts/h3-base', 'skills/prompt_guides/minimax_h3/base.md');
  serveFileResource(server, 'prompt-guide-h3-ref', 'director://skills/prompts/h3-ref', 'skills/prompt_guides/minimax_h3/ref.md');
  serveFileResource(server, 'prompt-guide-qwen21', 'director://skills/prompts/qwen21', 'skills/prompt_guides/qwen_image_2.1/t2i.md');

  // 4. Genre Profiles
  serveFileResource(server, 'genre-ad', 'director://skills/genres/ad', 'skills/genres/ad.md');
  serveFileResource(server, 'genre-drama', 'director://skills/genres/drama', 'skills/genres/short-drama.md');
  serveFileResource(server, 'genre-vlog', 'director://skills/genres/vlog', 'skills/genres/vlog.md');

  // 5. Review Rubric
  serveFileResource(server, 'review-rubric', 'director://skills/rubric', 'skills/rubric.md');
}
