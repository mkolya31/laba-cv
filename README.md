# laba-cv

Сайт Максима Коляченко: Next.js App Router, React, TypeScript. Статический экспорт для nginx на Ubuntu.

## Локальная работа

Node.js 24 (`.nvmrc`), npm.

```sh
npm ci
npm run dev
```

Открыть http://127.0.0.1:3000. Для production-preview:

```sh
npm run build
npm run preview
```

При первом `npm run dev` или `npm run preview` создаётся `.local/runtime-config.json` из [примера](runtime-config.example.json). Заполните этот локальный файл и перезапустите команду. Ссылки появятся после загрузки конфигурации в разделе после кейсов. Пример содержит фиктивные адреса: для проверки резюме задайте действительную HTTPS-ссылку.

Файлы `.local/runtime-config.json` и `public/runtime-config.json` исключены из git. Команда `npm run build` временно убирает локальную конфигурацию из public и восстанавливает после сборки: в `out` она не попадает. Для сборки используйте именно эту команду. PDF в проект не копируется. На VPS по-прежнему применяются переменные окружения и серверный генератор.

## Проверки

```sh
npx playwright install chromium
npm run check
npm run spec:validate
```

check выполняет ESLint, Prettier, TypeScript, сборку и браузерные smoke-тесты. ESLint/Prettier настроены командой `npx @kolyach/eslint-config init` с добавлением TSX.

## Содержание

- src/content/profile.ts — фразы и кейсы. Фраза про выходные добавлена для оценки внешнего вида; перед публикацией сверить фактический срок.
- src/app/globals.css — оформление и адаптивность.
- public/portrait.webp — портрет.
- src/lib/runtime.ts — проверка публичной конфигурации.
- scripts/ — preview, генерация конфигурации, переключение релиза.

Для изменения текста или фотографии обновить соответствующий файл и пройти проверки. У портрета сохранять альтернативный текст и корректные размеры. Контакты и PDF меняются на сервере без пересборки.

## Публикация

См. [инструкцию Ubuntu/nginx](docs/deployment.md). Контакты задаются через CONTACT_PHONE и CONTACT_TELEGRAM_URL, резюме — через RESUME_URL. PDF, настоящий runtime JSON и окружение не входят в git и артефакты CI. Резюме открывается в новой вкладке.

OpenSpec-изменение build-resume-mvp содержит требования и статус задач. Архивировать после проверки реальной публикации.
