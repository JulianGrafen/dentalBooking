/**
 * Seeds a fully configured local demo practice (E2EE keys + booking link).
 * Uses fetch only — no supabase-js (avoids WebSocket dependency in Node 20).
 */

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { encodeBase64 } = naclUtil;

const ROOT = resolve(import.meta.dirname, '..');
const RECOVERY_PATH = resolve(ROOT, '.demo-recovery.txt');

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const DEMO = {
  email: 'demo@teeth.al',
  password: 'demo-pass-123',
  practiceName: 'Zahnarztpraxis Dr. Müller',
};

function generateKeyPair() {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    privateKey: encodeBase64(keyPair.secretKey),
  };
}

async function authRequest(path, body) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.msg ?? json.message ?? JSON.stringify(json));
  }
  return json;
}

async function patchPractice(userId, publicKey) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/practices?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ public_key: publicKey }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(json));
  }
  return json[0];
}

function writeRecoveryFile(practiceName, email, password, privateKey, slug) {
  writeFileSync(
    RECOVERY_PATH,
    [
      'teeth.al — Demo Recovery Key',
      `Praxis: ${practiceName}`,
      `Login: ${email} / ${password}`,
      `Buchungslink: http://localhost:3000/book/${slug}`,
      '',
      '--- PRIVATE KEY (Base64) ---',
      privateKey,
      '',
    ].join('\n'),
    'utf8',
  );
}

async function main() {
  const keyPair = generateKeyPair();
  let userId;

  try {
    const signIn = await authRequest('/token?grant_type=password', {
      email: DEMO.email,
      password: DEMO.password,
    });
    userId = signIn.user.id;
    console.log('✓ Demo-User existiert bereits — Public Key wird aktualisiert');
  } catch {
    const signUp = await authRequest('/signup', {
      email: DEMO.email,
      password: DEMO.password,
      data: { practice_name: DEMO.practiceName },
    });
    userId = signUp.user?.id ?? signUp.id;
    console.log('✓ Demo-User angelegt');
  }

  const practice = await patchPractice(userId, keyPair.publicKey);
  writeRecoveryFile(DEMO.practiceName, DEMO.email, DEMO.password, keyPair.privateKey, practice.slug);

  console.log('');
  console.log('Demo-Praxis bereit:');
  console.log('  Login:    http://localhost:3000/login');
  console.log(`  E-Mail:   ${DEMO.email}`);
  console.log(`  Passwort: ${DEMO.password}`);
  console.log(`  Buchung:  http://localhost:3000/book/${practice.slug}`);
  console.log(`  Recovery: ${RECOVERY_PATH}`);
  console.log('');
  console.log('Nach Login: Private Key unter /unlock einfügen (aus Recovery-Datei).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
