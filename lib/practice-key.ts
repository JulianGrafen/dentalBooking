/**
 * Practice private-key storage — browser only, never sent to Supabase.
 */

import { decodeBase64 } from 'tweetnacl-util';
import nacl from 'tweetnacl';

const STORAGE_KEY = 'teethal_practice_private_key';

export function getPrivateKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setPrivateKey(privateKey: string): void {
  localStorage.setItem(STORAGE_KEY, privateKey.trim());
}

export function hasPrivateKey(): boolean {
  const key = getPrivateKey();
  return key !== null && isValidPrivateKey(key);
}

export function clearPrivateKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** NaCl box secret keys are exactly 32 bytes when base64-decoded. */
export function isValidPrivateKey(privateKeyBase64: string): boolean {
  try {
    const bytes = decodeBase64(privateKeyBase64.trim());
    return bytes.length === nacl.box.secretKeyLength;
  } catch {
    return false;
  }
}

export function downloadRecoveryKey(privateKey: string, practiceName: string): void {
  const safeName = practiceName.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  const blob = new Blob(
    [
      `teeth.al — Recovery Key\n`,
      `Praxis: ${practiceName}\n`,
      `Erstellt: ${new Date().toISOString()}\n`,
      `\n`,
      `WARNUNG: Bewahren Sie diese Datei sicher auf. Ohne diesen Schlüssel\n`,
      `können verschlüsselte Patientendaten nicht wiederhergestellt werden.\n`,
      `Der Schlüssel darf NIEMALS an Dritte weitergegeben werden.\n`,
      `\n`,
      `--- PRIVATE KEY (Base64) ---\n`,
      privateKey.trim(),
      `\n`,
    ],
    { type: 'text/plain;charset=utf-8' },
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `teeth-al-recovery-${safeName || 'praxis'}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
