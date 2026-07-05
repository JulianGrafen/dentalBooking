import { describe, expect, it } from 'vitest';
import nacl from 'tweetnacl';
import { decodeBase64 } from 'tweetnacl-util';
import {
  DecryptionError,
  decryptPatientData,
  encryptPatientData,
  generateKeyPair,
  type PatientBookingData,
} from './crypto';

const SAMPLE: PatientBookingData = {
  name: 'Anna Schmidt',
  email: 'anna@example.de',
  phone: '+49 170 1234567',
  insuranceType: 'kasse',
  treatment: 'Prophylaxe / Zahnreinigung',
};

describe('generateKeyPair', () => {
  it('produces valid NaCl box keys', () => {
    const { publicKey, privateKey } = generateKeyPair();
    expect(decodeBase64(publicKey)).toHaveLength(nacl.box.publicKeyLength);
    expect(decodeBase64(privateKey)).toHaveLength(nacl.box.secretKeyLength);
  });
});

describe('encryptPatientData / decryptPatientData', () => {
  it('round-trips patient data with the practice keypair', () => {
    const keys = generateKeyPair();
    const encrypted = encryptPatientData(SAMPLE, keys.publicKey);
    const decrypted = decryptPatientData(encrypted, keys.privateKey);

    expect(decrypted).toEqual(SAMPLE);
  });

  it('produces different ciphertext for each encryption (ephemeral keys)', () => {
    const keys = generateKeyPair();
    const a = encryptPatientData(SAMPLE, keys.publicKey);
    const b = encryptPatientData(SAMPLE, keys.publicKey);
    expect(a).not.toEqual(b);
  });

  it('throws DecryptionError with wrong private key', () => {
    const practice = generateKeyPair();
    const attacker = generateKeyPair();
    const encrypted = encryptPatientData(SAMPLE, practice.publicKey);

    expect(() => decryptPatientData(encrypted, attacker.privateKey)).toThrow(
      DecryptionError,
    );
  });

  it('throws DecryptionError on tampered payload', () => {
    const keys = generateKeyPair();
    const encrypted = encryptPatientData(SAMPLE, keys.publicKey);
    const tampered = encrypted.replace(/a/g, 'b');

    expect(() => decryptPatientData(tampered, keys.privateKey)).toThrow(
      DecryptionError,
    );
  });
});
