import { mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseConfig } from '../src/lib/runtime.ts';
const generate = async () => {
  const config = parseConfig({
    phone: process.env.CONTACT_PHONE,
    telegramUrl: process.env.CONTACT_TELEGRAM_URL,
    resumeUrl: process.env.RESUME_URL || '/resume.pdf',
  });
  const directory = resolve(process.argv[2] || '/srv/kolyach-dev/shared');
  await mkdir(directory, { recursive: true });
  const temp = resolve(directory, `.runtime-${process.pid}.tmp`);
  try {
    await writeFile(temp, JSON.stringify(config) + '\n', {
      flag: 'wx',
      mode: 0o644,
    });
    await rename(temp, resolve(directory, 'runtime-config.json'));
  } finally {
    await rm(temp, { force: true });
  }
};
generate().catch(() => {
  console.error(
    'Конфигурация не обновлена. Проверьте переменные и права доступа.',
  );
  process.exitCode = 1;
});
