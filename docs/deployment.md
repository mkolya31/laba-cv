# Публикация dev.kolyach.me

Сборка выполняется в GitHub Actions на Node.js 24. На VPS передаётся только `out/` с `release.json`; npm install и Next.js build на сервере не нужны. Общий `/opt/web-gateway` продолжает обслуживать TLS и ACME, отдельный Compose-проект `/opt/kolyach-dev` раздаёт статические файлы по HTTP в сети `web` без опубликованных портов.

## Проверка перед настройкой VPS

```sh
npm ci
npx playwright install chromium
npm run check
docker compose -f deploy/compose.yaml config --quiet
docker compose -f tests/deploy.compose.yaml run --rm site nginx -t
docker compose -f tests/deploy.compose.yaml up --abort-on-container-exit --exit-code-from test
docker compose -f tests/deploy.compose.yaml down --volumes
```

Последняя команда удаляет только изолированные контейнеры и volumes проекта `kolyach-dev-test`. Тест проверяет настоящую Linux-раздачу, symlink, замену JSON/PDF, старые assets, ошибки, блокировку и очистку. Перед повторным запуском теста завершите этот тестовый проект с `down --volumes`, чтобы получить чистые фикстуры. Контейнерные тесты также обязательны в CI перед загрузкой артефакта.

## Разовая подготовка администратором

1. Проверить DNS и исходное состояние VPS. При обследовании 15 ноября 2026 года `kolyach.me`, `wedding.kolyach.me`, `kamoved.ru` отвечали HTTPS 200, а `2popuga.kolyach.me` уже отвечал 502. Исправление последнего не относится к этому деплою.
2. Установить официальную Node.js 24 в `/opt/node24`, проверить SHA256 дистрибутива по опубликованным контрольным суммам. Зафиксировать установленную версию. Runtime принадлежит администратору и недоступен CI для записи.
3. Создать отдельного пользователя доставки `deploy-cv` без sudo, групп `docker` и `web`. Создать отдельный ключ CI, не использовать личный ключ PuTTY. В authorized_keys отключить forwarding/PTY, например через `restrict`; ключ должен поддерживать нужные SSH-команды и rsync. Закрытый ключ хранить только в GitHub Environment, не в проекте.
4. Создать корень `/srv/kolyach-dev` и каталоги `releases`, `assets`, `live`, `shared`, `tools`, `.state`. Корень и все публичные каталоги должны быть проходимы контейнером. CI получает запись только в `releases`, `assets`, `live`, `.state`. `shared` принадлежит автору/администратору и доступен CI/nginx только для чтения; исходный env CI читать не может. Tools и runtime управляются администратором. Проверить запреты под пользователем `deploy-cv`, не только от имени администратора.
5. В `/srv/kolyach-dev/tools` скопировать `scripts/activate-release.mjs`, `scripts/releases.mjs`, `scripts/release-files.mjs`, `scripts/generate-runtime.mjs`, `src/lib/runtime.ts`, сохранив структуру. Так как tools находится вне npm-проекта, добавить в корень tools `package.json` только с `{ "type": "module" }`, чтобы Node.js 24 однозначно читал TypeScript-валидатор как ESM. npm-зависимости этим скриптам не нужны.
6. В `/opt/kolyach-dev` скопировать `deploy/compose.yaml` и `deploy/nginx.conf` под именами `compose.yaml` и `nginx.conf`. Проверить наличие сети `web`. Образ nginx закреплён digest, поэтому обновление образа выполняется отдельно с тестами.

Пример начального распределения каталогов (выполняется администратором; пользователь `deploy-cv` должен уже существовать):

```sh
install -d -o root -g root -m 755 /srv/kolyach-dev /srv/kolyach-dev/tools /opt/kolyach-dev
install -d -o deploy-cv -g deploy-cv -m 755 /srv/kolyach-dev/releases /srv/kolyach-dev/assets /srv/kolyach-dev/live
install -d -o deploy-cv -g deploy-cv -m 700 /srv/kolyach-dev/.state
install -d -o mkolyach -g mkolyach -m 755 /srv/kolyach-dev/shared
```

Внутренний контейнер получает только read-only mounts `releases`, `live`, `shared`, `assets`, по тем же абсолютным путям. Монтируется каталог `live`, а не сам `live/current`. Так переключение указателя видно без рестарта. Env, tools, `.state`, Docker socket и TLS в контейнер сайта не попадают.

## Контакты и резюме

Автор создаёт env вне публичных каталогов, например `/home/mkolyach/cv.env`, с правами 600. Ниже только фиктивный пример:

```sh
CONTACT_PHONE=+15555550123
CONTACT_TELEGRAM_URL=https://t.me/example_user
RESUME_URL=/resume.pdf
```

Под пользователем автора:

```sh
set -a
. /home/mkolyach/cv.env
set +a
/opt/node24/bin/node /srv/kolyach-dev/tools/scripts/generate-runtime.mjs /srv/kolyach-dev/shared
```

JSON содержит только `phone`, `telegramUrl`, `resumeUrl`. Пустой или отсутствующий RESUME_URL даёт `/resume.pdf`; допустим внешний HTTPS-PDF без авторизации. При ошибке прежний JSON сохраняется, реальные значения не выводятся. Для локального варианта автор загружает `shared/resume.pdf`; он не входит в git или сборку. Каталог и файлы должны читаться всеми UID контейнера: 755 для каталогов, 644 для публичных файлов. Исходный env остаётся 600.

Для изменения контактов или ссылки повторить генерацию. Для PDF загрузить `resume.new.pdf`, проверить его и права, затем атомарно переименовать внутри shared:

```sh
mv /srv/kolyach-dev/shared/resume.new.pdf /srv/kolyach-dev/shared/resume.pdf
```

Не удалять прежний файл перед заменой. Новый запрос получает новую редакцию, в том числе при том же размере. JSON и PDF раздаются с `no-store`; перезапуск, сборка и reload не нужны. Уже открытая вкладка PDF сама не обновляется; кеш внешнего PDF-сервиса контролирует этот сервис.

## Первая публикация

1. Получить проверенный CI-артефакт с `release.json` (`sha` — полный SHA коммита, `run` — GITHUB_RUN_NUMBER, `attempt` — GITHUB_RUN_ATTEMPT). Передать в новый уникальный каталог `releases/<release-id>` с каталогами 755 и файлами 644; реальные JSON/PDF в релизе запрещены.
2. В `/opt/kolyach-dev` выполнить `docker compose config --quiet`, затем `docker compose run --rm site nginx -t` и `docker compose up -d site`. Новый контейнер может стартовать до появления current: gateway ещё не маршрутизирует к нему трафик.
3. Администратор определяет текущий внутренний IP `kolyach-dev` через `docker inspect` и выполняет начальную активацию с HTTP-адресом этого контейнера, например:

```sh
/opt/node24/bin/node /srv/kolyach-dev/tools/scripts/activate-release.mjs /srv/kolyach-dev RELEASE_ID bootstrap http://INTERNAL_CONTAINER_IP
```

`bootstrap` разрешён только без предыдущего current. Он валидирует файлы, публикует assets, переключает `live/current`, проверяет HTTP-раздачу из контейнера и записывает успешный релиз. Порт на хосте не публикуется. При ошибке процедура не подключает публичный virtual host.

4. Сохранить копию конфигов gateway вне `conf.d`. Установить только `deploy/gateway-http.conf` в `/opt/web-gateway/nginx/conf.d/dev.kolyach.me.conf`. Этот конфиг отдаёт ACME, остальные запросы пока получают 503. Проверить `docker compose exec nginx nginx -t` в `/opt/web-gateway`, затем `docker compose exec nginx nginx -s reload`. Не выполнять `up --force-recreate` или `down` общего gateway.
5. В `/opt/web-gateway` выпустить отдельный сертификат существующим Certbot:

```sh
docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot --email YOUR_EMAIL --agree-tos --no-eff-email -d dev.kolyach.me
```

6. Заменить новый конфиг на `deploy/gateway.conf`, снова выполнить nginx -t и reload. Проверить публичный HTTPS, редирект и ресурсы, затем повторить обычную активацию того же RELEASE_ID: она идемпотентно проверит уже опубликованную версию через HTTPS без переключения. Проверить участие сертификата в существующем cron продления; перед первым запуском cron проверить конфигурацию Certbot и выполнить согласованный renewal dry-run.
7. При неуспешной публичной приёмке первого релиза администратор переносит только `dev.kolyach.me.conf` за пределы `conf.d`, проверяет nginx и делает reload. Shared, релизы и соседние virtual hosts не удаляются. CI не получает право редактировать gateway ради этого случая.

## Последующие релизы через GitHub

В Environment `production` задать DEPLOY_HOST, DEPLOY_USER=`deploy-cv`, DEPLOY_KEY и DEPLOY_KNOWN_HOSTS. Host key сверить через доверенный канал. Ограничить environment веткой `production`. В защите ветки включить только PR, обязательные checks `production-source`/`verify`, актуальность ветки PR, запрет force push/удаления и обхода правил администраторами. Workflow сам по себе не запрещает merge: нужны настройки GitHub.

Деплой запускается после merge PR в `production` из `develop`, непустых `release/*` или `hotfix/*`. Прямой push, закрытие без merge и merge в другие ветки не публикуют сайт. Итоговый SHA собирается и тестируется, затем передаётся его артефакт. Перед переключением проверяются файлы и постоянные данные. После переключения сверяются байты публичной страницы, всех ресурсов, release.json и доступность PDF. Ошибка возвращает предыдущую версию и неуспешный статус.

Общая серверная блокировка защищает активацию, откат и очистку. Запуск старее последнего успешного отклоняется, даже после ручного отката. Идентичный повтор проверяет результат без повторного переключения. Каталог assets дополняется атомарно: одинаковый путь с другим содержимым отклоняется. Поэтому старая открытая страница продолжает загружать свой JS/CSS.

## Откат, очистка и прерванная операция

Под пользователем доставки:

```sh
/opt/node24/bin/node /srv/kolyach-dev/tools/scripts/activate-release.mjs /srv/kolyach-dev PREVIOUS_RELEASE_ID rollback
/opt/node24/bin/node /srv/kolyach-dev/tools/scripts/activate-release.mjs /srv/kolyach-dev - cleanup
```

Откат допускает только ранее успешный сохранённый релиз и проверяет результат по HTTPS. Очистка удаляет только записанные в истории успешные релизы за пределами последних пяти, сохраняя текущий даже после отката. Assets автоматически не удаляются; их отдельная очистка требует проверки сохраняемых релизов и срока поддержки старых страниц. Shared/tools/env и соседние проекты не изменяются; общий Docker prune не используется. Незавершённые каталоги загрузок автоматически не удаляются.

При SIGKILL или падении питания остаются `.state/lock` и, если переключение уже началось, журнал `pending` в `.state/releases.json`. Новые публикации блокируются. Администратор сначала убеждается, что активатора/отката/очистки больше нет, сохраняет журнал и проверяет current. Только после этого удаляет пустой каталог блокировки командой `rmdir /srv/kolyach-dev/.state/lock`. Если имеется pending:

```sh
/opt/node24/bin/node /srv/kolyach-dev/tools/scripts/activate-release.mjs /srv/kolyach-dev - recover
```

Recover возвращает указатель из pending и проверяет прежний релиз, сохраняя highwater. При отсутствии предшественника требует отключить только новый virtual host. Не редактировать журнал и highwater вслепую; ошибка возврата требует ручного вмешательства, успешный статус не выдаётся.

## Приёмка

Проверить HTTPS извне, сертификат, редирект, соседние сайты относительно baseline, контакты, выбранный PDF, мобильную страницу и клавиатуру. Проверить реальный разрешённый PR, неуспешную сборку без деплоя, откат, замену PDF одинакового размера, изменение RESUME_URL без сборки, сохранность shared и загрузку старого JS. Записать URL, SHA и результаты в `docs/verification.md`. До этих проверок серверные задачи OpenSpec не завершены.
