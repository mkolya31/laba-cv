import { test as base, expect } from '@playwright/test';

// Isolate normal browser tests from the real counter. Dedicated analytics tests
// override this context route with a local stub or an explicit failure.
export const test = base.extend({
  context: async ({ context }, run) => {
    await context.route('https://mc.yandex.ru/**', (route) => route.abort());
    await run(context);
  },
});

export { expect };
