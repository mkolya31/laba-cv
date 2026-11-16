import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';

const tagUrl = 'https://mc.yandex.ru/metrika/tag.js?id=114281247';
const pixelUrl = 'https://mc.yandex.ru/watch/114281247';
const fixture = {
  phone: '+15555550123',
  telegramUrl: 'https://t.me/example_user',
  resumeUrl: 'https://example.org/cv.pdf',
};

test.beforeEach(async ({ page }) => {
  await page.route('**/runtime-config.json', (route) =>
    route.fulfill({ json: fixture }),
  );
});

test('Метрика: параметры, очередь и одна инициализация на документ', async ({
  page,
}) => {
  let requests = 0;
  await page.route(tagUrl, (route) => {
    requests++;
    return route.fulfill({
      contentType: 'application/javascript',
      body: 'window.metrikaCalls = Array.from(window.ym.a || [], args => Array.from(args));',
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/', { referer: 'https://example.org/hiring' });
  const calls = () => page.evaluate(() => Reflect.get(window, 'metrikaCalls'));
  await expect.poll(calls).toEqual([
    [
      114281247,
      'init',
      {
        ssr: true,
        webvisor: true,
        clickmap: true,
        ecommerce: 'dataLayer',
        referrer: 'https://example.org/hiring',
        url: page.url(),
        accurateTrackBounce: true,
        trackLinks: true,
      },
    ],
  ]);
  const script = page.locator(`script[src="${tagUrl}"]`);
  await expect(script).toHaveCount(1);
  expect(
    await script.evaluate((element) => (element as HTMLScriptElement).async),
  ).toBe(true);
  // React state updates must not re-run analytics.
  await page.getByRole('button', { name: 'Следующая фраза' }).click();
  await expect(page.locator('.phrase')).toHaveText(
    'лучший разработчик Сбера 2023',
  );
  await expect(page.getByRole('link', { name: 'Позвонить мне' })).toBeVisible();
  // Even an accidental second execution of the bootstrap must be harmless.
  await page.evaluate(() => {
    const repeated = document.createElement('script');
    repeated.textContent =
      document.getElementById('yandex-metrika')!.textContent;
    document.body.appendChild(repeated);
    repeated.remove();
  });
  expect(
    await page.evaluate(() =>
      Array.from(Reflect.get(window, 'ym').a, (args) =>
        Array.from(args as ArrayLike<unknown>),
      ),
    ),
  ).toHaveLength(1);
  expect(requests).toBe(1);
  await expect(script).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('Метрика: статический noscript и пиксель без JavaScript', async ({
  browser,
  baseURL,
}) => {
  const html = await readFile('out/index.html', 'utf8');
  expect(html).toMatch(
    /<noscript>[\s\S]*?<img[^>]*src="https:\/\/mc\.yandex\.ru\/watch\/114281247"[\s\S]*?<\/noscript>/,
  );
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    let pixels = 0;
    let tags = 0;
    await context.route(pixelUrl, (route) => {
      pixels++;
      return route.fulfill({ status: 204 });
    });
    await context.route(tagUrl, (route) => {
      tags++;
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(baseURL!);
    await expect(page.locator('h1')).toContainText('Коляченко');
    await expect.poll(() => pixels).toBe(1);
    expect(tags).toBe(0);
    const pixel = page.locator('noscript img');
    await expect(pixel).toHaveAttribute('alt', '');
    expect(
      await pixel.evaluate((element) => element.getBoundingClientRect().right),
    ).toBeLessThan(0);
  } finally {
    await context.close();
  }
});

for (const width of [360, 768, 1440]) {
  test(`Метрика заблокирована: интерфейс и клавиатура при ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let blocked = 0;
    await page.route(tagUrl, (route) => {
      blocked++;
      return route.abort();
    });
    await page.goto('/');
    await expect.poll(() => blocked).toBe(1);
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Перейти к кейсам' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const previous = page.getByRole('button', { name: 'Предыдущая фраза' });
    await expect(previous).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.phrase')).toHaveText('хочу работать в R&D');
    await expect(previous).toBeFocused();
    await expect(
      page.getByRole('link', { name: 'моё резюме' }),
    ).toHaveAttribute('href', fixture.resumeUrl);
    await expect(
      page.getByRole('link', { name: 'моё резюме' }),
    ).toHaveAttribute('target', '_blank');
    await expect(
      page.getByRole('link', { name: 'Позвонить мне' }),
    ).toHaveAttribute('href', `tel:${fixture.phone}`);
    await expect(
      page.getByRole('link', { name: 'Написать в телеге' }),
    ).toHaveAttribute('href', fixture.telegramUrl);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
