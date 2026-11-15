import { rename, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
await mkdir('.local', { recursive: true });
const temporary = `.local/runtime-build-${process.pid}.json`;
let moved = false;
try {
  try {
    await rename('public/runtime-config.json', temporary);
    moved = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const code = await new Promise((accept, reject) => {
    const child = spawn(
      process.execPath,
      [resolve('node_modules/next/dist/bin/next'), 'build'],
      { stdio: 'inherit' },
    );
    child.on('error', reject);
    child.on('exit', (value) => accept(value ?? 1));
  });
  process.exitCode = Number(code);
} finally {
  if (moved) await rename(temporary, 'public/runtime-config.json');
}
