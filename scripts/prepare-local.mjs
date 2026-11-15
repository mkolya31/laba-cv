import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseConfig } from '../src/lib/runtime.ts';
await mkdir('.local', { recursive: true });
try {
  await copyFile(
    'runtime-config.example.json',
    '.local/runtime-config.json',
    1,
  );
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
const config = parseConfig(
  JSON.parse(await readFile('.local/runtime-config.json', 'utf8')),
);
await mkdir('public', { recursive: true });
await writeFile('public/runtime-config.json', JSON.stringify(config) + '\n');
console.log(
  'Локальная конфигурация: .local/runtime-config.json. Измените значения и перезапустите dev/preview.',
);
