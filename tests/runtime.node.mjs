import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseConfig } from '../src/lib/runtime.ts';
const valid = {
  phone: '+15555550123',
  telegramUrl: 'https://t.me/example_user',
  resumeUrl: '/resume.pdf',
};
test('разрешены только действительные публичные URL', () => {
  assert.deepEqual(parseConfig(valid), valid);
  for (const resumeUrl of [
    'javascript:alert(1)',
    '//example.org/cv.pdf',
    'http://example.org/cv.pdf',
    'https://user:pass@example.org/cv.pdf',
  ]) {
    assert.throws(() => parseConfig({ ...valid, resumeUrl }));
  }
  assert.throws(() =>
    parseConfig({ ...valid, telegramUrl: 'https://example.org/user' }),
  );
});
test('генератор сохраняет предыдущую конфигурацию при ошибке', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cv-runtime-'));
  const env = {
    ...process.env,
    CONTACT_PHONE: valid.phone,
    CONTACT_TELEGRAM_URL: valid.telegramUrl,
    RESUME_URL: '',
    PRIVATE_TOKEN: 'never-export-this',
  };
  const run = (overrides) =>
    spawnSync(
      process.execPath,
      [resolve('scripts/generate-runtime.mjs'), directory],
      { env: { ...env, ...overrides } },
    );
  try {
    assert.equal(run({}).status, 0);
    assert.deepEqual(
      JSON.parse(
        await readFile(join(directory, 'runtime-config.json'), 'utf8'),
      ),
      valid,
    );
    assert.equal(run({ RESUME_URL: 'https://example.org/cv.pdf' }).status, 0);
    const previous = await readFile(
      join(directory, 'runtime-config.json'),
      'utf8',
    );
    const failed = run({ RESUME_URL: 'javascript:alert(1)' });
    assert.equal(failed.status, 1);
    assert.equal(
      await readFile(join(directory, 'runtime-config.json'), 'utf8'),
      previous,
    );
    assert.equal(previous.includes('PRIVATE_TOKEN'), false);
    assert.equal(failed.stderr.toString().includes('javascript:'), false);
  } finally {
    await rm(directory, { recursive: true });
  }
});
