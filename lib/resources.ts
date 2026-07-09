import { z } from 'zod';
import type { ResourceType } from '@/types/database';

export const RESOURCE_TYPES = ['chair', 'room', 'equipment'] as const;

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  chair: 'Behandlungsstuhl',
  room: 'Raum',
  equipment: 'Gerät',
};

export const resourceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Der Name muss mindestens 2 Zeichen haben')
    .max(120, 'Der Name darf höchstens 120 Zeichen haben'),
  type: z.enum(RESOURCE_TYPES, { message: 'Bitte wählen Sie einen Ressourcen-Typ' }),
});

export type ResourceFormInput = z.infer<typeof resourceFormSchema>;
