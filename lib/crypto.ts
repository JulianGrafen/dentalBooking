/**
 * E2EE crypto utilities (Zero-Knowledge booking flow).
 *
 * Scheme: NaCl box (x25519-xsalsa20-poly1305) in "sealed box" style —
 * the patient's browser generates an EPHEMERAL key pair per booking, so
 * patients need no persistent keys and the practice's private key is the
 * only thing that can ever decrypt a payload. That private key never
 * leaves the practice's browser.
 *
 * All functions are pure (no storage, no network) and safe to unit-test.
 */

import nacl from 'tweetnacl';
import {
  decodeBase64,
  decodeUTF8,
  encodeBase64,
  encodeUTF8,
} from 'tweetnacl-util';

/** Plaintext structure that gets encrypted end-to-end. */
export interface PatientBookingData {
  name: string;
  email: string;
  phone?: string;
  insuranceType: 'kasse' | 'privat';
  treatment: string;
}

/** Serialized envelope stored in appointments.encrypted_payload. */
interface EncryptedEnvelope {
  v: 1;
  alg: 'nacl.box.x25519-xsalsa20-poly1305';
  /** Ephemeral public key of the sender (patient browser), base64. */
  epk: string;
  nonce: string;
  ciphertext: string;
}

export interface KeyPairBase64 {
  publicKey: string;
  privateKey: string;
}

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

/** Generates the long-lived key pair for a practice (both keys base64). */
export function generateKeyPair(): KeyPairBase64 {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    privateKey: encodeBase64(keyPair.secretKey),
  };
}

/**
 * Encrypts patient data against the practice's public key.
 * Returns the JSON envelope string for appointments.encrypted_payload.
 */
export function encryptPatientData(
  payload: PatientBookingData,
  practicePublicKeyBase64: string,
): string {
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  const ciphertext = nacl.box(
    decodeUTF8(JSON.stringify(payload)),
    nonce,
    decodeBase64(practicePublicKeyBase64),
    ephemeral.secretKey,
  );

  const envelope: EncryptedEnvelope = {
    v: 1,
    alg: 'nacl.box.x25519-xsalsa20-poly1305',
    epk: encodeBase64(ephemeral.publicKey),
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(ciphertext),
  };

  return JSON.stringify(envelope);
}

/**
 * Decrypts an encrypted_payload with the practice's private key.
 * Throws DecryptionError on tampered/corrupt payloads or wrong keys.
 */
export function decryptPatientData(
  encryptedPayload: string,
  practicePrivateKeyBase64: string,
): PatientBookingData {
  let envelope: EncryptedEnvelope;
  try {
    envelope = JSON.parse(encryptedPayload) as EncryptedEnvelope;
  } catch {
    throw new DecryptionError('Payload ist kein gültiger Envelope');
  }

  if (envelope.v !== 1) {
    throw new DecryptionError(`Unbekannte Envelope-Version: ${envelope.v}`);
  }

  const plaintext = nacl.box.open(
    decodeBase64(envelope.ciphertext),
    decodeBase64(envelope.nonce),
    decodeBase64(envelope.epk),
    decodeBase64(practicePrivateKeyBase64),
  );

  if (!plaintext) {
    throw new DecryptionError(
      'Entschlüsselung fehlgeschlagen — falscher Schlüssel oder manipulierte Daten',
    );
  }

  return JSON.parse(encodeUTF8(plaintext)) as PatientBookingData;
}
