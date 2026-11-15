import config from '@kolyach/eslint-config';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '.next/**',
      'out/**',
      'playwright-report/**',
      'test-results/**',
      '.idea/**',
      '.local/**',
      'next-env.d.ts',
    ],
  },
  ...config,
  ...tseslint.configs.recommended,
];
