/**
 * Seeds a fully configured local demo practice (E2EE keys + booking link +
 * one encrypted sample appointment for today's dashboard).
 */

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { encodeBase64, decodeBase64, decodeUTF8 } = naclUtil;

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

function encryptPatientData(payload, practicePublicKeyBase64) {
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const ciphertext = nacl.box(
    decodeUTF8(JSON.stringify(payload)),
    nonce,
    decodeBase64(practicePublicKeyBase64),
    ephemeral.secretKey,
  );

  return JSON.stringify({
    v: 1,
    alg: 'nacl.box.x25519-xsalsa20-poly1305',
    epk: encodeBase64(ephemeral.publicKey),
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(ciphertext),
  });
}

/** Returns a slot today at 10:00 or 14:00 (whichever is still in the future). */
function todaySampleSlot() {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setHours(10, 0, 0, 0);
  if (start <= new Date()) {
    start.setHours(14, 0, 0, 0);
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function authRequest(path, body) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.msg ?? json.message ?? JSON.stringify(json));
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
  if (!response.ok) throw new Error(JSON.stringify(json));
  return json[0];
}

async function seedSampleAppointment(practiceId, publicKey) {
  const slot = todaySampleSlot();
  const encrypted = encryptPatientData(
    {
      name: 'Max Mustermann (Demo)',
      email: 'max.demo@example.de',
      phone: '+49 170 0000000',
      insuranceType: 'kasse',
      treatment: 'Prophylaxe / Zahnreinigung',
    },
    publicKey,
  );

  const response = await fetch(`${SUPABASE_URL}/rest/v1/appointments`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      practice_id: practiceId,
      encrypted_payload: encrypted,
      start_time: slot.start,
      end_time: slot.end,
      source: 'online',
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
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
    console.log('✓ Demo-User existiert — Keys & Termin werden aktualisiert');
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
  await seedSampleAppointment(userId, keyPair.publicKey);
  writeRecoveryFile(DEMO.practiceName, DEMO.email, DEMO.password, keyPair.privateKey, practice.slug);

  console.log('');
  console.log('Demo-Praxis bereit:');
  console.log('  Login:    http://localhost:3000/login');
  console.log(`  E-Mail:   ${DEMO.email}`);
  console.log(`  Passwort: ${DEMO.password}`);
  console.log(`  Buchung:  http://localhost:3000/book/${practice.slug}`);
  console.log(`  Recovery: ${RECOVERY_PATH}`);
  console.log('  Termin:   1 Demo-Termin für heute im Dashboard (nach Unlock)');
  console.log('');
  console.log('Flow: Login → /unlock (Recovery-Key einfügen) → Dashboard');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
