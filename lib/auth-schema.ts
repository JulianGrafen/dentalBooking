import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort erforderlich'),
});

export const registerSchema = z.object({
  practiceName: z
    .string()
    .trim()
    .min(2, 'Praxisname muss mindestens 2 Zeichen haben')
    .max(200),
  email: z.string().trim().email('Ungültige E-Mail-Adresse'),
  password: z
    .string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .max(128),
});

export const unlockSchema = z.object({
  privateKey: z
    .string()
    .trim()
    .min(1, 'Private Key erforderlich')
    .refine(
      (value) => {
        const match = value.match(/--- PRIVATE KEY \(Base64\) ---\s*\n([\s\S]+)/);
        const key = match ? match[1].trim() : value.trim();
        // Lazy import avoided — validated again in the unlock page via isValidPrivateKey.
        return key.length > 0;
      },
      { message: 'Ungültiger Private Key' },
    ),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/** Extracts the base64 key from a recovery file or raw paste. */
export function extractPrivateKey(input: string): string {
  const match = input.match(/--- PRIVATE KEY \(Base64\) ---\s*\n([\s\S]+)/);
  return (match ? match[1] : input).trim();
}
