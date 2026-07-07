/**
 * Smoke test: demo practice exists, public key set, sample appointment
 * decrypts with the recovery key on disk.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

const { decodeBase64, encodeUTF8 } = naclUtil;

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const RECOVERY_PATH = resolve(import.meta.dirname, '..', '.demo-recovery.txt');
const ADMIN = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` };

function extractPrivateKey(content) {
  const match = content.match(/--- PRIVATE KEY \(Base64\) ---\s*\n([\s\S]+)/);
  return (match ? match[1] : content).trim();
}

function decrypt(encryptedPayload, privateKeyBase64) {
  const envelope = JSON.parse(encryptedPayload);
  const plaintext = nacl.box.open(
    decodeBase64(envelope.ciphertext),
    decodeBase64(envelope.nonce),
    decodeBase64(envelope.epk),
    decodeBase64(privateKeyBase64),
  );
  if (!plaintext) throw new Error('decryption failed');
  return JSON.parse(encodeUTF8(plaintext));
}

async function main() {
  if (!existsSync(RECOVERY_PATH)) {
    console.error('✗ .demo-recovery.txt fehlt — zuerst npm run seed:demo');
    process.exit(1);
  }

  const privateKey = extractPrivateKey(readFileSync(RECOVERY_PATH, 'utf8'));

  const practiceRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_booking_practice`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ booking_slug: 'zahnarztpraxis-dr-mueller' }),
  });
  const practiceRows = await practiceRes.json();
  const practice = Array.isArray(practiceRows) ? practiceRows[0] : practiceRows;
  if (!practice?.public_key) throw new Error('Demo-Praxis ohne public_key');

  const practiceIdRes = await fetch(
    `${SUPABASE_URL}/rest/v1/practices?slug=eq.zahnarztpraxis-dr-mueller&select=id`,
    { headers: ADMIN },
  );
  const [practiceRow] = await practiceIdRes.json();
  if (!practiceRow?.id) throw new Error('Demo-Praxis nicht gefunden');

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const apptRes = await fetch(
    `${SUPABASE_URL}/rest/v1/appointments?practice_id=eq.${practiceRow.id}&start_time=gte.${start}&start_time=lt.${end}&select=encrypted_payload`,
    { headers: ADMIN },
  );
  const appointments = await apptRes.json();
  if (!Array.isArray(appointments) || appointments.length === 0) {
    throw new Error('Kein Demo-Termin für heute gefunden');
  }

  const patient = decrypt(appointments[0].encrypted_payload, privateKey);
  console.log('✓ E2EE round-trip OK');
  console.log(`  Patient: ${patient.name}`);
  console.log(`  Termine heute: ${appointments.length}`);
}

main().catch((error) => {
  console.error('✗', error.message);
  process.exit(1);
});
