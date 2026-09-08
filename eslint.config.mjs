import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Layer boundaries. `app -> server -> domain` and `app -> game -> domain`.
// `domain` imports nothing from the other layers. `game` never imports `server`.
// A lint error beats a README rule; this boundary is the one that erodes.
const layerZones = [
  {
    target: './src/domain',
    from: './src/server',
    message: 'domain must stay pure',
  },
  {
    target: './src/domain',
    from: './src/game',
    message: 'domain must stay pure',
  },
  {
    target: './src/domain',
    from: './src/app',
    message: 'domain must stay pure',
  },
  {
    target: './src/domain',
    from: './src/components',
    message: 'domain must stay pure',
  },
  {
    target: './src/game',
    from: './src/server',
    message: 'game never imports server',
  },
  {
    target: './src/app',
    from: './src/server/db',
    message: 'app goes through services and repositories, never the db',
  },
];

// Motion goes through src/game/systems/juice, which no-ops under reduced
// motion. A raw animation library or a direct post-fx spike bypasses that.
const motionImports = {
  paths: [
    {
      name: 'gsap',
      message: 'Use the juice primitives; they honour reduced motion.',
    },
    {
      name: 'framer-motion',
      message: 'Use the juice primitives; they honour reduced motion.',
    },
    {
      name: 'motion',
      message: 'Use the juice primitives; they honour reduced motion.',
    },
    {
      name: 'animejs',
      message: 'Use the juice primitives; they honour reduced motion.',
    },
    {
      name: '@/game/post-fx',
      message: 'Spike bloom through src/game/systems/juice, not directly.',
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        { basePath: import.meta.dirname, zones: layerZones },
      ],
    },
  },
  {
    // Route tests exercise the database directly; they are not the app layer.
    files: ['src/app/api/**/*.test.ts'],
    rules: { 'import/no-restricted-paths': 'off' },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/game/systems/juice/**',
      'src/game/scene/post-processing.tsx',
      'src/game/entities/instanced-group.tsx',
    ],
    rules: { 'no-restricted-imports': ['error', motionImports] },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'drizzle/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]),
]);

export default eslintConfig;
