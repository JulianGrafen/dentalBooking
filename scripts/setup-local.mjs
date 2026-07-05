#!/usr/bin/env node
/**
 * Reads credentials from a running local Supabase stack and writes .env.local.
 * Requires Docker + `npm run db:start`.
 */

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_PATH = resolve(ROOT, '.env.local');

try {
  const raw = execSync('npx supabase status -o json', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const status = JSON.parse(raw);
  const url = status.API_URL ?? status.apiUrl;
  const anonKey = status.ANON_KEY ?? status.anonKey;

  if (!url || !anonKey) {
    throw new Error('API_URL oder ANON_KEY fehlt in `supabase status`');
  }

  writeFileSync(
    ENV_PATH,
    `# Local Supabase — ${new Date().toISOString()}
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=${url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
`,
    'utf8',
  );

  console.log(`✓ ${ENV_PATH} aus lokalem Supabase geschrieben`);
  console.log(`  URL: ${url}`);
  console.log('  Dev-Server neu starten: npm run dev');
} catch (error) {
  console.error('Lokales Supabase nicht erreichbar.');
  console.error('1. Docker Desktop installieren & starten');
  console.error('2. npm run db:start');
  console.error('3. npm run setup:local');
  if (error instanceof Error && 'stderr' in error && error.stderr) {
    console.error(String(error.stderr));
  }
  process.exit(1);
}
