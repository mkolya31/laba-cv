import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdir,
  writeFile,
  readFile,
  rename,
  chmod,
  rm,
  symlink,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  activate,
  currentId,
  inspectRelease,
  withLock,
  cleanup,
  recover,
} from '../scripts/releases.mjs';
import { publishAssets } from '../scripts/release-files.mjs';

const base = '/srv/kolyach-dev';
const origin = process.env.DEPLOY_TEST_ORIGIN;
const config = {
  phone: '+15555550123',
  telegramUrl: 'https://t.me/example_user',
  resumeUrl: '/resume.pdf',
};
const put = async (name, data) => {
  const path = resolve(base, name);
  await mkdir(resolve(path, '..'), { recursive: true, mode: 0o755 });
  await writeFile(path, data, { mode: 0o644 });
};
const release = async (id, run, chunk = `${id}.js`) => {
  await put(
    `releases/${id}/index.html`,
    `<html><script src="/_next/static/${chunk}"></script>${id}</html>`,
  );
  await put(`releases/${id}/portrait.webp`, `portrait-${id}`);
  await put(`releases/${id}/_next/static/${chunk}`, `console.log('${id}');`);
  await put(
    `releases/${id}/release.json`,
    JSON.stringify({ sha: String(run).padStart(40, '0'), run, attempt: 1 }),
  );
};
const get = async (path) => {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  return response.text();
};

test(
  'Linux/nginx: activation, shared replacements, old assets, rollback and race protection',
  { skip: !origin },
  async () => {
    for (const dir of ['releases', 'live', 'shared', 'assets'])
      await mkdir(resolve(base, dir), { recursive: true, mode: 0o755 });
    await put('shared/runtime-config.json', JSON.stringify(config));
    await put('shared/resume.pdf', '%PDF-1.7\noriginal');
    await release('one', 1);
    await activate({ base, id: 'one', mode: 'bootstrap', origin });
    assert.match(await get('/'), /one/);
    const oldJS = await get('/_next/static/one.js');
    await release('two', 2);
    await activate({ base, id: 'two', origin });
    assert.match(await get('/'), /two/);
    assert.equal(await get('/_next/static/one.js'), oldJS);
    const replacement = { ...config, phone: '+15555550124' };
    await put('shared/runtime.new.json', JSON.stringify(replacement));
    await rename(
      resolve(base, 'shared/runtime.new.json'),
      resolve(base, 'shared/runtime-config.json'),
    );
    const pdf = '%PDF-1.7\nreplaced';
    await put('shared/resume.new.pdf', pdf);
    await rename(
      resolve(base, 'shared/resume.new.pdf'),
      resolve(base, 'shared/resume.pdf'),
    );
    assert.deepEqual(
      JSON.parse(await get('/runtime-config.json')),
      replacement,
    );
    assert.equal(await get('/resume.pdf'), pdf);
    await activate({ base, id: 'two', origin }); // idempotent repeat
    await activate({ base, id: 'one', mode: 'rollback', origin });
    assert.equal(await currentId(base), 'one');
    await assert.rejects(activate({ base, id: 'one', origin }), /Stale/);
    assert.equal(await get('/resume.pdf'), pdf);
    assert.deepEqual(
      JSON.parse(await get('/runtime-config.json')),
      replacement,
    );

    await release('collision', 3, 'one.js');
    await assert.rejects(
      activate({ base, id: 'collision', origin }),
      /collision/,
    );
    assert.equal(await get('/_next/static/one.js'), oldJS);
    await release('missing', 4);
    await rm(resolve(base, 'releases/missing/_next/static/missing.js'));
    await assert.rejects(activate({ base, id: 'missing', origin }), /Missing/);
    await release('unreadable', 5);
    await chmod(resolve(base, 'releases/unreadable/portrait.webp'), 0o600);
    await assert.rejects(inspectRelease(base, 'unreadable'), /cannot read/);
    await assert.rejects(inspectRelease(base, '../tools'), /Invalid/);

    await release('failed', 6);
    await release('changed-input', 6);
    const changing = await inspectRelease(base, 'changed-input');
    await put(
      'releases/changed-input/_next/static/changed-input.js',
      'changed during copy',
    );
    await assert.rejects(publishAssets(changing), /changed during activation/);
    assert.equal(
      (await fetch(new URL('/_next/static/changed-input.js', origin))).status,
      404,
    );
    assert.equal(await get('/_next/static/one.js'), oldJS);
    const actualFetch = globalThis.fetch;
    let failed = false;
    globalThis.fetch = async (...args) => {
      if (!failed && (await currentId(base)) === 'failed') {
        failed = true;
        throw new Error('Simulated postflight failure');
      }
      return actualFetch(...args);
    };
    try {
      await assert.rejects(
        activate({ base, id: 'failed', origin }),
        /previous release restored/,
      );
    } finally {
      globalThis.fetch = actualFetch;
    }
    assert.equal(await currentId(base), 'one');
    assert.match(await get('/'), /one/);
    assert.equal(
      JSON.parse(await readFile(resolve(base, '.state/releases.json')))
        .highwater.run,
      2,
    );

    const calls = [];
    await Promise.all(
      [1, 2].map((value) =>
        withLock(base, async () => {
          calls.push(`start${value}`);
          await new Promise((accept) => setTimeout(accept, 150));
          calls.push(`end${value}`);
        }),
      ),
    );
    assert(
      ['start1,end1,start2,end2', 'start2,end2,start1,end1'].includes(
        calls.join(','),
      ),
    );
    for (const path of [
      '/.state/releases.json',
      '/tools/scripts/releases.mjs',
      '/.env',
    ]) {
      assert(
        [403, 404].includes((await fetch(new URL(path, origin))).status),
        path,
      );
    }
    assert.equal(
      (await fetch(new URL('/runtime-config.json', origin))).headers.get(
        'cache-control',
      ),
      'no-store',
    );
    assert.equal(
      (await fetch(new URL('/resume.pdf', origin))).headers.get(
        'cache-control',
      ),
      'no-store',
    );

    await release('recovery-fails', 7);
    globalThis.fetch = async () => {
      throw new Error('Simulated network failure');
    };
    try {
      await assert.rejects(
        activate({ base, id: 'recovery-fails', origin }),
        /Rollback failed/,
      );
    } finally {
      globalThis.fetch = actualFetch;
    }
    await recover(base, origin);
    assert.equal(await currentId(base), 'one');
    for (let run = 7; run <= 13; run++) {
      await release(`release-${run}`, run);
      await activate({ base, id: `release-${run}`, origin });
    }
    await activate({ base, id: 'one', mode: 'rollback', origin });
    const removed = await cleanup(base);
    assert(removed.includes('two'));
    assert(!removed.includes('one'));
    assert.match(await get('/_next/static/two.js'), /two/);
    for (let run = 9; run <= 13; run++) {
      assert(
        (await readFile(resolve(base, `releases/release-${run}/index.html`)))
          .length > 0,
      );
    }
    const statePath = resolve(base, '.state/releases.json');
    const state = JSON.parse(await readFile(statePath));
    state.pending = { previous: 'one', next: 'release-13' };
    await writeFile(statePath, JSON.stringify(state));
    await assert.rejects(
      activate({ base, id: 'release-13', origin }),
      /recovery required/,
    );
    await recover(base, origin);
    assert.equal(await currentId(base), 'one');
    assert.equal(JSON.parse(await readFile(statePath)).highwater.run, 13);
    const before = JSON.parse(await readFile(statePath));
    await symlink(resolve(base, 'shared'), resolve(base, 'releases/escape'));
    before.successful.push({
      id: 'escape',
      sha: '0'.repeat(40),
      run: 1,
      attempt: 1,
    });
    await writeFile(statePath, JSON.stringify(before));
    await assert.rejects(cleanup(base), /symlink prohibited/);
    assert.equal(await get('/resume.pdf'), pdf);
  },
);
