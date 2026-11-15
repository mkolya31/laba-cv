import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  lstat,
  realpath,
  rename,
  symlink,
  readlink,
  unlink,
  link,
  rm,
} from 'node:fs/promises';
import { resolve, relative, dirname, sep } from 'node:path';
import { parseConfig } from '../src/lib/runtime.ts';

const hash = (data) => createHash('sha256').update(data).digest('hex');
export const optional = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return null;
  }
};
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
export const atomicJSON = async (path, data) => {
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(data) + '\n', {
      flag: 'wx',
      mode: 0o644,
    });
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
};
export const withLock = async (base, operation) => {
  const state = resolve(base, '.state');
  await mkdir(state, { recursive: true });
  const lock = resolve(state, 'lock');
  // Never steal a potentially live lock. A crash requires operator recovery.
  const deadline = Date.now() + 30000;
  for (;;) {
    try {
      await mkdir(lock);
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() >= deadline)
        throw new Error(
          'Publication locked: check owner or recover stale lock',
        );
      await new Promise((accept) => setTimeout(accept, 100));
    }
  }
  try {
    return await operation();
  } finally {
    await rm(lock, { recursive: true });
  }
};
const readable = async (path, directory = false) => {
  const stat = await lstat(path);
  if (
    stat.isSymbolicLink() ||
    (directory ? !stat.isDirectory() : !stat.isFile())
  )
    throw new Error('Unsupported file');
  // Public trees are readable/traversable by any container worker UID.
  if (
    process.platform === 'linux' &&
    Math.floor(stat.mode / (directory ? 1 : 4)) % 2 === 0
  )
    throw new Error('Container cannot read file');
};
const walk = async (directory) => {
  await readable(directory, true);
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) throw new Error('Hidden release file');
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else {
      await readable(path);
      files.push(path);
    }
  }
  return files;
};
const metadata = (value) => {
  if (
    !value ||
    !/^[a-f0-9]{40}$/.test(value.sha) ||
    !Number.isSafeInteger(value.run) ||
    value.run < 1 ||
    !Number.isSafeInteger(value.attempt) ||
    value.attempt < 1
  )
    throw new Error('Invalid release metadata');
  return { sha: value.sha, run: value.run, attempt: value.attempt };
};
export const compare = (a, b) => a.run - b.run || a.attempt - b.attempt;
const responseBytes = async (url) => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('HTTP verification failed');
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    type: response.headers.get('content-type') || '',
  };
};
const validateHTML = async (release, manifest) => {
  const html = await readFile(resolve(release, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)=["'](\/[^"']+)["']/g)) {
    const path = decodeURIComponent(match[1].split(/[?#]/)[0]);
    if (path.startsWith('/_next/') && !manifest.has(path))
      throw new Error('Missing referenced asset');
  }
};
const validateShared = async (base) => {
  const configPath = resolve(base, 'shared/runtime-config.json');
  await readable(configPath);
  const config = parseConfig(await json(configPath));
  if (config.resumeUrl === '/resume.pdf') {
    const path = resolve(base, 'shared/resume.pdf');
    await readable(path);
    if ((await readFile(path)).subarray(0, 5).toString() !== '%PDF-')
      throw new Error('Invalid PDF');
  } else {
    const pdf = await responseBytes(config.resumeUrl);
    if (
      !pdf.type.includes('application/pdf') ||
      pdf.bytes.subarray(0, 5).toString() !== '%PDF-'
    )
      throw new Error('Invalid external PDF');
  }
};
export const inspectRelease = async (base, id) => {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,159}$/.test(id))
    throw new Error('Invalid release id');
  base = await realpath(base);
  for (const name of ['releases', 'live', 'shared', 'assets'])
    await readable(resolve(base, name), true);
  const release = resolve(base, 'releases', id);
  if ((await realpath(release)) !== release)
    throw new Error('Release symlink prohibited');
  const files = await walk(release);
  const manifest = new Map();
  for (const file of files) {
    const name = '/' + relative(release, file).split(sep).join('/');
    if (['/runtime-config.json', '/resume.pdf'].includes(name))
      throw new Error('Permanent data in release');
    manifest.set(name, hash(await readFile(file)));
  }
  for (const name of ['/index.html', '/portrait.webp', '/release.json'])
    if (!manifest.has(name)) throw new Error('Incomplete release');
  await validateHTML(release, manifest);
  await validateShared(base);
  return {
    base,
    id,
    release,
    manifest,
    meta: metadata(await json(resolve(release, 'release.json'))),
  };
};
const linkOrCheck = async (temp, destination, digest) => {
  try {
    await link(temp, destination);
  } catch (error) {
    if (error.code !== 'EEXIST' || hash(await readFile(destination)) !== digest)
      throw error;
  }
};
export const publishAssets = async (info) => {
  const entries = [...info.manifest].filter(([path]) =>
    path.startsWith('/_next/static/'),
  );
  for (const [name, digest] of entries) {
    const existing = await optional(() =>
      readFile(resolve(info.base, 'assets', '.' + name)),
    );
    if (existing && hash(existing) !== digest)
      throw new Error('Asset collision');
  }
  for (const [name, digest] of entries) {
    const destination = resolve(info.base, 'assets', '.' + name);
    await mkdir(dirname(destination), { recursive: true, mode: 0o755 });
    const temp = resolve(dirname(destination), `.${randomUUID()}.tmp`);
    try {
      const bytes = await readFile(resolve(info.release, '.' + name));
      if (hash(bytes) !== digest)
        throw new Error('Release changed during activation');
      await writeFile(temp, bytes, { flag: 'wx', mode: 0o644 });
      await linkOrCheck(temp, destination, digest);
    } finally {
      await rm(temp, { force: true });
    }
  }
};
export const currentId = async (base) => {
  const target = await optional(() => readlink(resolve(base, 'live/current')));
  if (!target) return null;
  const id = relative(resolve(base, 'releases'), resolve(base, 'live', target));
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,159}$/.test(id))
    throw new Error('Invalid current pointer');
  return id;
};
export const switchTo = async (base, id) => {
  const current = resolve(base, 'live/current');
  if (!id) {
    await unlink(current);
    return;
  }
  const temp = resolve(base, 'live', `.current-${randomUUID()}`);
  try {
    await symlink(`../releases/${id}`, temp);
    await rename(temp, current);
  } finally {
    await rm(temp, { force: true });
  }
};
export const verifyRelease = async (info, origin) => {
  for (const [name, digest] of info.manifest) {
    const url = new URL(name === '/index.html' ? '/' : name, origin);
    url.searchParams.set('deployment-check', randomUUID());
    if (hash((await responseBytes(url)).bytes) !== digest)
      throw new Error('Published release mismatch');
  }
  const result = await responseBytes(new URL('/runtime-config.json', origin));
  const config = parseConfig(JSON.parse(result.bytes.toString()));
  const pdf = await responseBytes(new URL(config.resumeUrl, origin));
  if (
    !pdf.type.includes('application/pdf') ||
    pdf.bytes.subarray(0, 5).toString() !== '%PDF-'
  )
    throw new Error('Published PDF unavailable');
};
