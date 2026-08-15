/**
 * Compiles the AI layer to CommonJS and returns a loader for it, so the
 * verification scripts can exercise the REAL shipped modules instead of a
 * re-implementation that can drift from them.
 *
 * Shared by scripts/verify-ai-offline.mjs (stubbed transport) and
 * scripts/verify-openai.mjs (live API).
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '../..');
export const BUILD = join(ROOT, '.verify-build');

const require = createRequire(import.meta.url);
const Module = require('node:module');
const TSC_BIN = join(ROOT, 'node_modules/typescript/bin/tsc');
let originalResolve = null;

/**
 * Compiles services/ai/** and its dependencies. Returns { load, cleanup }.
 * Throws with the tsc output attached when compilation fails.
 */
export function compileAiLayer() {
  rmSync(BUILD, { recursive: true, force: true });

  try {
    // Run the local tsc entrypoint with the current node binary: no `npx`
    // (spawning npx.cmd without a shell is EINVAL on Node 24) and no
    // `shell: true` (deprecated, DEP0190).
    execFileSync(process.execPath, [TSC_BIN, '-p', join(ROOT, 'scripts/tsconfig.verify.json')], {
      cwd: ROOT,
      stdio: 'pipe',
    });
  } catch (e) {
    const error = new Error('tsc failed to compile the AI layer');
    error.tscOutput = String(e.stdout ?? e.message);
    throw error;
  }

  // The emitted CJS keeps Next's "@/..." path alias verbatim, which Node
  // cannot resolve. Map it onto the build output.
  if (!originalResolve) {
    originalResolve = Module._resolveFilename;
    Module._resolveFilename = function (request, ...rest) {
      if (typeof request === 'string' && request.startsWith('@/')) {
        return originalResolve.call(this, join(BUILD, request.slice(2)), ...rest);
      }
      return originalResolve.call(this, request, ...rest);
    };
  }

  const load = (rel) => {
    const p = join(BUILD, rel);
    if (!existsSync(p)) throw new Error(`compiled module missing: ${rel}`);
    return require(p);
  };

  const cleanup = () => {
    if (originalResolve) {
      Module._resolveFilename = originalResolve;
      originalResolve = null;
    }
    rmSync(BUILD, { recursive: true, force: true });
  };

  return { load, cleanup, require };
}

/** True when the repo has been installed, so compilation is possible. */
export function canCompile() {
  return existsSync(TSC_BIN) && existsSync(join(ROOT, 'node_modules/openai'));
}
