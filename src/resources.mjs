import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';
import { getProjectPath } from './projects.mjs';

export function registerResources(server) {
  // 1. Director Core Rules
  server.resource(
    'director-core',
    'director://skills/core',
    async (uri) => {
      const filePath = path.join(config.rootDir, 'skills', 'director-core.md');
      const text = fs.readFileSync(filePath, 'utf8');
      return {
        contents: [{
          uri: uri.href,
          text,
          mimeType: 'text/markdown'
        }]
      };
    }
  );

  // 2. Ad Genre Profile
  server.resource(
    'genre-ad',
    'director://skills/genres/ad',
    async (uri) => {
      const filePath = path.join(config.rootDir, 'skills', 'genres', 'ad.md');
      const text = fs.readFileSync(filePath, 'utf8');
      return {
        contents: [{
          uri: uri.href,
          text,
          mimeType: 'text/markdown'
        }]
      };
    }
  );

  // 3. Review Rubric
  server.resource(
    'review-rubric',
    'director://skills/rubric',
    async (uri) => {
      const filePath = path.join(config.rootDir, 'skills', 'rubric.md');
      const text = fs.readFileSync(filePath, 'utf8');
      return {
        contents: [{
          uri: uri.href,
          text,
          mimeType: 'text/markdown'
        }]
      };
    }
  );
}
