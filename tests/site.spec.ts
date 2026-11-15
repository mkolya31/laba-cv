import { test, expect } from '@playwright/test';
const fixture = {
  phone: '+15555550123',
  telegramUrl: 'https://t.me/example_user',
  resumeUrl: '/resume.pdf',
};
test.beforeEach(async ({ page }) => {
  await page.route('**/runtime-config.json', (route) =>
    route.fulfill({ json: fixture }),
  );
});
test('кейсы перед резюме, действующие контакты, новая вкладка', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('article')).toHaveCount(4);
  const resume = page.getByRole('link', { name: 'моё резюме' });
  await expect(resume).toHaveAttribute('href', '/resume.pdf');
  await expect(resume).toHaveAttribute('target', '_blank');
  await expect(resume).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(
    page.getByRole('link', { name: 'Позвонить мне' }),
  ).toHaveAttribute('href', 'tel:+15555550123');
  expect(
    await page
      .locator('#cases')
      .evaluate(
        (element) =>
          !!(
            element.compareDocumentPosition(
              document.querySelector('#contact')!,
            ) & Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
  ).toBe(true);
});
test('внешний PDF и ошибка конфигурации', async ({ page }) => {
  await page.route('**/runtime-config.json', (route) =>
    route.fulfill({
      json: { ...fixture, resumeUrl: 'https://example.org/cv.pdf' },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'моё резюме' })).toHaveAttribute(
    'href',
    'https://example.org/cv.pdf',
  );
  await page.route('**/runtime-config.json', (route) =>
    route.fulfill({ status: 503 }),
  );
  await page.reload();
  await expect(page.getByRole('status')).toContainText('временно недоступны');
  await expect(page.getByRole('link', { name: 'моё резюме' })).toHaveCount(0);
});
test('таймер, ручное переключение, задержка и фокус', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const phrase = page.locator('.phrase');
  await expect(phrase).toHaveText('Сделал этот сайт за выходные');
  await page.clock.fastForward(6000);
  await expect(phrase).toHaveText('лучший разработчик Сбера 2023');
  await page.getByRole('button', { name: 'Следующая фраза' }).click();
  await page.clock.fastForward(40000);
  await expect(phrase).toHaveText('люблю вайбкодить');
  await page.getByRole('button', { name: 'Следующая фраза' }).click();
  await page.mouse.move(0, 0);
  await page.locator('h1').click();
  await page.clock.fastForward(29000);
  await expect(phrase).toHaveText('круто презентую идеи');
  await page.clock.fastForward(1000);
  await expect(phrase).toHaveText('хочу работать в R&D');
});
test('сокращение движения и адаптивность', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  await page.clock.fastForward(45000);
  await expect(page.locator('.phrase')).toHaveText(
    'Сделал этот сайт за выходные',
  );
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (let i = 0; i < 5; i++) {
      const top = await page
        .locator('#cases')
        .evaluate((e) => e.getBoundingClientRect().top + scrollY);
      await page.getByRole('button', { name: 'Следующая фраза' }).click();
      expect(
        await page
          .locator('#cases')
          .evaluate((e) => e.getBoundingClientRect().top + scrollY),
      ).toBeCloseTo(top, 0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test('чтение без JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Коляченко');
  await expect(page.locator('article')).toHaveCount(4);
  await expect(
    page.getByText('Для открытия резюме и контактов включите JavaScript.'),
  ).toBeVisible();
  await context.close();
});

test('клавиатурное управление сохраняет фокус', async ({ page }) => {
  await page.goto('/');
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
  expect(
    await previous.evaluate(
      (element) => getComputedStyle(element).outlineStyle,
    ),
  ).not.toBe('none');
});

test('текст 200% на узком экране', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/');
  await page.evaluate(() => {
    const elements = [...document.querySelectorAll<HTMLElement>('body *')];
    const sizes = elements.map((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    );
    elements.forEach((element, index) => {
      element.style.fontSize = `${sizes[index] * 2}px`;
    });
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole('link', { name: 'Позвонить мне' })).toBeVisible();
});
