import path from 'node:path';
import { config } from './config.mjs';

/**
 * Validate incoming auth token
 */
export function validateToken(token) {
  if (!config.authToken) return true;
  if (!token) return false;
  const clean = token.replace(/^Bearer\s+/i, '').trim();
  return clean === config.authToken;
}

/**
 * Lock path to ensure it resides inside the allowed project directory or ComfyUI input/output
 */
export function sanitizePath(userPath, projectName = null) {
  if (!userPath) throw new Error('Path cannot be empty');
  const resolved = path.resolve(userPath);

  const allowedRoots = [
    config.projectsDir,
    'C:\\AI\\input',
    'C:\\AI\\output',
    config.rootDir
  ];

  if (projectName) {
    const projectRoot = path.resolve(config.projectsDir, projectName);
    allowedRoots.unshift(projectRoot);
  }

  const isAllowed = allowedRoots.some(root => resolved.toLowerCase().startsWith(root.toLowerCase()));
  if (!isAllowed) {
    throw new Error(`Security violation: Access to path '${resolved}' is forbidden. Path must stay within project root.`);
  }

  return resolved;
}

/**
 * Simple Mutex concurrency lock for GPU tasks (1 job at a time)
 */
class GpuLock {
  constructor() {
    this.locked = false;
    this.queue = [];
  }

  async acquire() {
    return new Promise(resolve => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.locked = false;
    }
  }

  async runExclusive(task) {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }
}

export const gpuLock = new GpuLock();
