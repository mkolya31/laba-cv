import { readFile, realpath, symlink, rename, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { parseConfig } from '../src/lib/runtime.ts';
const activate = async () => {
  if (process.platform !== 'linux') throw new Error('Linux required');
  const base = await realpath(process.argv[2]);
  const release = await realpath(resolve(base, 'releases', process.argv[3]));
  const releases = await realpath(resolve(base, 'releases'));
  if (!release.startsWith(releases + sep))
    throw new Error('Invalid release path');
  await readFile(resolve(release, 'index.html'));
  await readFile(resolve(release, 'portrait.webp'));
  const config = parseConfig(
    JSON.parse(
      await readFile(resolve(base, 'shared/runtime-config.json'), 'utf8'),
    ),
  );
  if (config.resumeUrl === '/resume.pdf') {
    const pdf = await readFile(resolve(base, 'shared/resume.pdf'));
    if (pdf.subarray(0, 5).toString() !== '%PDF-')
      throw new Error('PDF missing');
  } else {
    const response = await fetch(config.resumeUrl, {
      signal: AbortSignal.timeout(10000),
    });
    if (
      !response.ok ||
      !response.headers.get('content-type')?.includes('application/pdf')
    )
      throw new Error('Resume unavailable');
    await response.body?.cancel();
  }
  const next = resolve(base, `.current-${process.pid}`);
  try {
    await symlink(release, next);
    await rename(next, resolve(base, 'current'));
  } finally {
    await rm(next, { force: true });
  }
  console.log('Релиз активирован. Постоянные файлы сохранены.');
};
activate().catch(() => {
  console.error(
    'Релиз не активирован. Проверьте артефакт, runtime-конфигурацию и доступность PDF.',
  );
  process.exitCode = 1;
});
