import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

// three.js and friends ship ESM. Phase 3 needs them transformed. next/jest
// ignores all of node_modules by default, so this list is applied after it
// builds each project config. The .pnpm pattern matters for pnpm layouts.
const esmPackages = [
  'three',
  '@react-three',
  '@monogrid',
  'troika-three-text',
  'troika-three-utils',
  'troika-worker-utils',
  'its-fine',
  'meshoptimizer',
].join('|');

const transformIgnorePatterns = [
  `/node_modules/(?!.pnpm)(?!(${esmPackages})/)`,
  `/node_modules/.pnpm/(?!(${esmPackages})@)`,
  '^.+\\.module\\.(css|sass|scss)$',
];

const shared: Config = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(glsl|vs|fs|vert|frag)$': '<rootDir>/__mocks__/shader.ts',
  },
};

// Pure functions. No DOM, no database.
const domain: Config = {
  ...shared,
  displayName: 'domain',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/domain/**/*.test.ts',
    '<rootDir>/src/lib/**/*.test.ts',
  ],
};

// Integration tests against the real Postgres in .env.test. Run `pnpm db:up` first.
const server: Config = {
  ...shared,
  displayName: 'server',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/server/**/*.test.ts',
    '<rootDir>/src/app/api/**/*.test.ts',
  ],
  setupFiles: ['<rootDir>/jest.setup.server.ts'],
  globalSetup: '<rootDir>/jest.global-setup.server.ts',
};

// React Testing Library. Behaviour from the user's side, never internals.
const ui: Config = {
  ...shared,
  displayName: 'ui',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/{app,components,game}/**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['<rootDir>/src/app/api/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

async function withNext(config: Config): Promise<Config> {
  const resolved = await createJestConfig(config)();
  return { ...resolved, transformIgnorePatterns };
}

export default async function jestConfig(): Promise<Config> {
  return {
    projects: [
      await withNext(domain),
      await withNext(server),
      await withNext(ui),
    ],
    // High where it is cheap and where the money bugs live; nothing elsewhere.
    // A global number produces tests written to move a number.
    collectCoverageFrom: [
      'src/domain/**/*.ts',
      'src/server/services/**/*.ts',
      '!src/domain/types/**',
      '!src/domain/assets/manifest.generated.ts',
      '!**/*.test.ts',
    ],
    coverageThreshold: {
      global: {},
      './src/domain/': { branches: 90 },
      './src/server/services/': { branches: 75 },
    },
  };
}
