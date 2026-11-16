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
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.locator('.switcher').hover();
  await page.mouse.move(0, 0);
  const phrase = page.locator('.phrase');
  await expect(phrase).toHaveText('Сделал этот сайт за выходные');
  await page.clock.runFor(3999);
  await expect(phrase).toHaveText('Сделал этот сайт за выходные');
  await page.clock.runFor(1);
  await expect(phrase).toHaveText('лучший разработчик Сбера 2023');
  await page.getByRole('button', { name: 'Следующая фраза' }).click();
  await page.clock.runFor(40000);
  await expect(phrase).toHaveText('Умею в фронт, бэк и devops');
  await page.getByRole('button', { name: 'Следующая фраза' }).click();
  await page.mouse.move(0, 0);
  await page.locator('h1').click();
  await page.clock.runFor(29999);
  await expect(phrase).toHaveText('люблю вайбкодить');
  await page.clock.runFor(1);
  await expect(phrase).toHaveText('круто презентую идеи');
  await page.clock.runFor(4000);
  await expect(phrase).toHaveText('хочу работать в R&D');
  await page.clock.runFor(4000);
  await expect(phrase).toHaveText('Сделал этот сайт за выходные');
});

test('новая фраза, её соседи и автоматический переход', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.locator('.switcher').hover();
  await page.mouse.move(0, 0);
  const phrase = page.locator('.phrase');
  const next = page.getByRole('button', { name: 'Следующая фраза' });
  const previous = page.getByRole('button', { name: 'Предыдущая фраза' });
  await page.clock.runFor(4000);
  await expect(phrase).toHaveText('лучший разработчик Сбера 2023');
  await page.clock.runFor(4000);
  await expect(phrase).toHaveText('Умею в фронт, бэк и devops');
  await expect(page.locator('.dots > span')).toHaveCount(6);
  await expect(page.locator('.dots > span').nth(2)).toHaveClass('active');
  await page.clock.runFor(4000);
  await expect(phrase).toHaveText('люблю вайбкодить');
  await page.clock.runFor(4000);
  await expect(phrase).toHaveText('круто презентую идеи');
  await page.clock.runFor(4000);
  await expect(phrase).toHaveText('хочу работать в R&D');
  await page.clock.runFor(4000);
  await expect(phrase).toHaveText('Сделал этот сайт за выходные');
  await page.clock.runFor(4000);
  await expect(phrase).toHaveText('лучший разработчик Сбера 2023');
  await page.clock.runFor(4000);
  await expect(phrase).toHaveText('Умею в фронт, бэк и devops');
  await page.clock.runFor(4000);
  await expect(phrase).toHaveText('люблю вайбкодить');
  await previous.click();
  await expect(phrase).toHaveText('Умею в фронт, бэк и devops');
  await previous.click();
  await expect(phrase).toHaveText('лучший разработчик Сбера 2023');
  await expect(previous).toBeFocused();
  await next.click();
  await expect(phrase).toHaveText('Умею в фронт, бэк и devops');
  await next.click();
  await expect(phrase).toHaveText('люблю вайбкодить');
  await expect(next).toBeFocused();
});
test('наведение и фокус останавливают таймер и запускают новый интервал', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const phrase = page.locator('.phrase');
  const previous = page.getByRole('button', { name: 'Предыдущая фраза' });
  await page.locator('.switcher').hover();
  await page.clock.runFor(40000);
  await expect(phrase).toHaveText('Сделал этот сайт за выходные');
  await previous.focus();
  await page.mouse.move(0, 0);
  await page.clock.runFor(40000);
  await expect(phrase).toHaveText('Сделал этот сайт за выходные');
  await page.locator('h1').click();
  await page.clock.runFor(3999);
  await expect(phrase).toHaveText('Сделал этот сайт за выходные');
  await page.clock.runFor(1);
  await expect(phrase).toHaveText('лучший разработчик Сбера 2023');
});

test('скрытая вкладка останавливает автосмену', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  // Эмулируем сигнал видимости документа без зависимости от окон CI.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(40000);
  await expect(page.locator('.phrase')).toHaveText(
    'Сделал этот сайт за выходные',
  );
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(3999);
  await expect(page.locator('.phrase')).toHaveText(
    'Сделал этот сайт за выходные',
  );
  await page.clock.runFor(1);
  await expect(page.locator('.phrase')).toHaveText(
    'лучший разработчик Сбера 2023',
  );
});

test('сокращение движения и адаптивность', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  await page.clock.fastForward(45000);
  await expect(page.locator('.phrase')).toHaveText(
    'Сделал этот сайт за выходные',
  );
  await page.getByRole('button', { name: 'Следующая фраза' }).click();
  await page.mouse.move(0, 0);
  await page.locator('h1').click();
  await page.clock.runFor(45000);
  await expect(page.locator('.phrase')).toHaveText(
    'лучший разработчик Сбера 2023',
  );
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (let i = 0; i < 6; i++) {
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Следующая фраза' }).click();
  }
  await expect(page.locator('.phrase')).toHaveText(
    'Умею в фронт, бэк и devops',
  );
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
