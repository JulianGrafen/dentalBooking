/** Bookable treatment types — single source of truth for booking UI & validation. */
export const TREATMENT_TYPES = [
  { id: 'prophylaxe', label: 'Prophylaxe / Zahnreinigung', durationMinutes: 60 },
  { id: 'kontrolle', label: 'Kontrolluntersuchung', durationMinutes: 30 },
  { id: 'schmerzbehandlung', label: 'Schmerzbehandlung', durationMinutes: 45 },
  { id: 'fuellung', label: 'Füllungstherapie', durationMinutes: 60 },
  { id: 'beratung', label: 'Beratungsgespräch', durationMinutes: 30 },
] as const;

export type TreatmentId = (typeof TREATMENT_TYPES)[number]['id'];

export const TREATMENT_IDS = TREATMENT_TYPES.map((t) => t.id) as [
  TreatmentId,
  ...TreatmentId[],
];

export function getTreatment(id: TreatmentId) {
  // Safe: TreatmentId is derived from TREATMENT_TYPES itself.
  return TREATMENT_TYPES.find((t) => t.id === id)!;
}
