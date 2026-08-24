export const FORBIDDEN_AI_PROVIDER_KEYS = new Set([
  'patient_name',
  'patientName',
  'appointment_id',
  'appointmentId',
  'user_id',
  'userId',
  'doctor_id',
  'doctorId',
  'tckn',
  'email',
  'phone',
  'price',
  'rating',
  'storage_path',
  'storagePath',
  'document_id',
  'documentId',
  'original_file_name',
  'originalFileName',
  'file_name',
  'fileName',
]);

export type DoctorBriefProviderVisit = {
  ref: string;
  date: string;
  noteFormat: 'free_text' | 'soap';
  clinicalNote: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
};

export type DoctorBriefProviderContext = {
  pastVisits: DoctorBriefProviderVisit[];
};

type DoctorBriefContextSource = {
  past_visits: DoctorBriefProviderVisit[];
};

export class AIProviderPrivacyError extends Error {
  constructor() {
    super('AI provider payload contains a forbidden application field.');
    this.name = 'AIProviderPrivacyError';
  }
}

export function assertNoForbiddenAIProviderKeys(value: unknown): void {
  const pending: unknown[] = [value];
  const visited = new Set<object>();

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || typeof current !== 'object' || visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      pending.push(...current);
      continue;
    }

    for (const [key, child] of Object.entries(current)) {
      if (FORBIDDEN_AI_PROVIDER_KEYS.has(key)) throw new AIProviderPrivacyError();
      pending.push(child);
    }
  }
}

export function buildDoctorBriefProviderContext(
  context: DoctorBriefContextSource,
): DoctorBriefProviderContext {
  const providerContext: DoctorBriefProviderContext = {
    pastVisits: context.past_visits.map((visit) => ({
      ref: visit.ref,
      date: visit.date,
      noteFormat: visit.noteFormat,
      clinicalNote: visit.clinicalNote,
      subjective: visit.subjective,
      objective: visit.objective,
      assessment: visit.assessment,
      plan: visit.plan,
    })),
  };

  assertNoForbiddenAIProviderKeys(providerContext);
  return providerContext;
}
