import { z } from 'zod';

// One validated object, one source of truth. A missing variable crashes at
// boot with a precise message instead of surfacing as `undefined` mid-request.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

const envSchema = z
  .object({
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(32),
    AUTH_GOOGLE_ID: z.string().min(1),
    AUTH_GOOGLE_SECRET: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),
    LLM_PROVIDER: z
      .enum(['anthropic-api', 'byok', 'local-cli', 'claude-code', 'fake'])
      .default('anthropic-api'),
    // Which Claude generates cards. Card quality is the product; keep Opus.
    ANTHROPIC_MODEL_CARDS: z.string().default('claude-opus-5'),
    // AES-256-GCM key material for stored BYOK keys. Any string of 32+ chars.
    ENCRYPTION_KEY: z.string().min(32).optional(),
    // Per user, per calendar month, for the platform-key path. $5 by default.
    MONTHLY_LLM_QUOTA_CENTS: z.coerce.number().int().nonnegative().default(500),
    // The owner's own Claude subscription through the Agent SDK. In production
    // this needs the token from `claude setup-token` and an explicit opt-in:
    // a subscription serving other people is the owner's decision to make.
    CLAUDE_CODE_OAUTH_TOKEN: z.string().min(20).optional(),
    ALLOW_CLAUDE_CODE_IN_PRODUCTION: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    // Development and end-to-end only: a shorter minimum session.
    MIN_SESSION_MS_OVERRIDE: z.coerce.number().int().positive().optional(),
    // CI runs the production build against the fake provider and a short
    // minimum. This flag is the only way those pass the production gates.
    // The local CLI stays refused whatever this says: that one is a ToS line.
    E2E_TEST_MODE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    // Optional CDN prefix for optimised GLBs. Empty means same-origin /models.
    NEXT_PUBLIC_ASSET_BASE_URL: z.string().default(''),
  })
  // A terms-of-service boundary, not a feature flag: the local CLI backs the
  // developer's own subscription and may never serve other users. `next build`
  // also runs with NODE_ENV=production, so the build phase is exempt; the
  // provider constructor still refuses at runtime.
  .refine(
    (e) =>
      isBuildPhase ||
      !(e.LLM_PROVIDER === 'local-cli' && e.NODE_ENV === 'production'),
    {
      message: 'LLM_PROVIDER=local-cli is not permitted in production',
      path: ['LLM_PROVIDER'],
    },
  )
  .refine(
    (e) =>
      isBuildPhase ||
      e.LLM_PROVIDER !== 'claude-code' ||
      e.NODE_ENV !== 'production' ||
      (e.ALLOW_CLAUDE_CODE_IN_PRODUCTION && Boolean(e.CLAUDE_CODE_OAUTH_TOKEN)),
    {
      message:
        'LLM_PROVIDER=claude-code in production needs ALLOW_CLAUDE_CODE_IN_PRODUCTION=true and CLAUDE_CODE_OAUTH_TOKEN',
      path: ['LLM_PROVIDER'],
    },
  )
  // The fake provider and the short minimum exist for end-to-end runs of
  // the production build. They need the explicit flag to get past here.
  .refine(
    (e) =>
      isBuildPhase ||
      e.E2E_TEST_MODE ||
      !(e.LLM_PROVIDER === 'fake' && e.NODE_ENV === 'production'),
    {
      message: 'LLM_PROVIDER=fake needs E2E_TEST_MODE=true in production',
      path: ['LLM_PROVIDER'],
    },
  )
  .refine(
    (e) =>
      isBuildPhase ||
      e.E2E_TEST_MODE ||
      e.MIN_SESSION_MS_OVERRIDE === undefined ||
      e.NODE_ENV !== 'production',
    {
      message: 'MIN_SESSION_MS_OVERRIDE needs E2E_TEST_MODE=true in production',
      path: ['MIN_SESSION_MS_OVERRIDE'],
    },
  );

export type Env = z.infer<typeof envSchema>;

// Google sign-in only shows once real credentials exist. Placeholders keep
// the app booting until then; email and password always work.
export function googleSignInEnabled(e: Env): boolean {
  return (
    e.AUTH_GOOGLE_ID !== 'placeholder' && e.AUTH_GOOGLE_SECRET !== 'placeholder'
  );
}

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (result.success) return result.data;
  const issues = result.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment:\n${issues}`);
}

export const env = loadEnv();
