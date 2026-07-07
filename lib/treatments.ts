/** Default treatments seeded for new practices — also used as local fallback. */
export const DEFAULT_BOOKING_TREATMENTS = [
  { slug: 'prophylaxe', label: 'Prophylaxe / Zahnreinigung', durationMinutes: 60 },
  { slug: 'kontrolle', label: 'Kontrolluntersuchung', durationMinutes: 30 },
  { slug: 'schmerzbehandlung', label: 'Schmerzbehandlung', durationMinutes: 45 },
  { slug: 'fuellung', label: 'Füllungstherapie', durationMinutes: 60 },
  { slug: 'beratung', label: 'Beratungsgespräch', durationMinutes: 30 },
] as const;

export type PracticeBookingTreatment = {
  slug: string;
  label: string;
  durationMinutes: number;
};

/** Allowed booking durations in 15-minute steps (matches DB constraint). */
export const BOOKING_DURATION_OPTIONS = Array.from({ length: 12 }, (_, index) => (index + 1) * 15);

export function findBookingTreatment(
  slug: string,
  treatments: PracticeBookingTreatment[],
): PracticeBookingTreatment | undefined {
  return treatments.find((treatment) => treatment.slug === slug);
}

/** @deprecated Use practice-specific treatments from the database. */
export const TREATMENT_TYPES = DEFAULT_BOOKING_TREATMENTS.map((treatment) => ({
  id: treatment.slug,
  label: treatment.label,
  durationMinutes: treatment.durationMinutes,
}));

/** @deprecated Use practice-specific treatment slugs. */
export type TreatmentId = (typeof DEFAULT_BOOKING_TREATMENTS)[number]['slug'];

/** @deprecated Use practice-specific treatment slugs. */
export const TREATMENT_IDS = DEFAULT_BOOKING_TREATMENTS.map((t) => t.slug) as [
  TreatmentId,
  ...TreatmentId[],
];

/** @deprecated Use findBookingTreatment with practice config. */
export function getTreatment(id: TreatmentId) {
  return TREATMENT_TYPES.find((t) => t.id === id)!;
}
