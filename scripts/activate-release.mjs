import { activate, cleanup, recover } from './releases.mjs';

try {
  if (process.platform !== 'linux') throw new Error('Linux required');
  const [base, id, mode = 'activate', bootstrapOrigin] = process.argv.slice(2);
  if (
    !['activate', 'rollback', 'bootstrap', 'cleanup', 'recover'].includes(mode)
  )
    throw new Error('Invalid mode');
  if (mode !== 'bootstrap' && bootstrapOrigin)
    throw new Error('Origin override prohibited');
  const origin =
    mode === 'bootstrap' ? bootstrapOrigin : 'https://dev.kolyach.me';
  if (!origin || (mode === 'bootstrap' && new URL(origin).protocol !== 'http:'))
    throw new Error('Bootstrap requires internal HTTP origin');
  if (mode === 'cleanup') await cleanup(base);
  else if (mode === 'recover') await recover(base);
  else await activate({ base, id, mode, origin });
  console.log('Релиз проверен и активирован. Постоянные файлы сохранены.');
} catch {
  console.error(
    'Деплой не завершён. Проверьте файлы, блокировку и журнал .state. При ошибке возврата требуется администратор; без предшественника отключите только новый virtual host.',
  );
  process.exitCode = 1;
}
