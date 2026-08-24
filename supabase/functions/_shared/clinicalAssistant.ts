export type ClinicalAssistantAction = 'summary' | 'clinical_note_draft';
export type ClinicalAssistantStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type CurrentNote = {
  noteFormat: 'free_text' | 'soap';
  clinicalNote: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
};

const SUMMARY_STATUSES = new Set<ClinicalAssistantStatus>(['confirmed', 'in_progress', 'completed']);

export const isClinicalAssistantActionAllowed = (
  status: ClinicalAssistantStatus,
  action: ClinicalAssistantAction,
) => action === 'summary' ? SUMMARY_STATUSES.has(status) : status === 'in_progress';

export const hasMeaningfulCurrentNote = (note: CurrentNote) => (
  note.noteFormat === 'free_text'
    ? Boolean(note.clinicalNote?.trim())
    : [note.subjective, note.objective, note.assessment, note.plan].some((value) => Boolean(value?.trim()))
);

export const normalizeCurrentNote = (value: unknown): CurrentNote | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allowedKeys = new Set(['noteFormat', 'clinicalNote', 'subjective', 'objective', 'assessment', 'plan']);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null;
  const note = value as Record<string, unknown>;
  if (note.noteFormat !== 'free_text' && note.noteFormat !== 'soap') return null;
  const limits: Record<string, number> = { clinicalNote: 10000, subjective: 5000, objective: 5000, assessment: 5000, plan: 5000 };
  for (const [key, limit] of Object.entries(limits)) {
    if (note[key] !== null && typeof note[key] !== 'string') return null;
    if (typeof note[key] === 'string' && note[key].length > limit) return null;
  }
  return {
    noteFormat: note.noteFormat,
    clinicalNote: note.noteFormat === 'free_text' ? (note.clinicalNote as string | null) : null,
    subjective: note.noteFormat === 'soap' ? (note.subjective as string | null) : null,
    objective: note.noteFormat === 'soap' ? (note.objective as string | null) : null,
    assessment: note.noteFormat === 'soap' ? (note.assessment as string | null) : null,
    plan: note.noteFormat === 'soap' ? (note.plan as string | null) : null,
  };
};

export const hasOnlyAllowedEvidenceRefs = (refs: unknown, allowed: Set<string>) =>
  Array.isArray(refs) && refs.length > 0 && refs.every((ref) => typeof ref === 'string' && allowed.has(ref));

type DraftBoundaryCandidate = {
  noteFormat?: unknown;
  subjective?: unknown;
  objective?: unknown;
  assessment?: unknown;
  plan?: unknown;
  evidenceRefs?: unknown;
};

export const validateClinicalNoteDraftBoundary = (
  source: CurrentNote,
  output: DraftBoundaryCandidate,
): 'invalid_shape' | 'invalid_evidence_ref' | 'disallowed_claim' | null => {
  if (output.noteFormat !== source.noteFormat) return 'invalid_shape';
  if (!hasOnlyAllowedEvidenceRefs(output.evidenceRefs, new Set(['CURRENT_NOTE']))
    || (output.evidenceRefs as unknown[]).length !== 1) return 'invalid_evidence_ref';
  if (source.noteFormat !== 'soap') return null;

  for (const field of ['subjective', 'objective', 'assessment', 'plan'] as const) {
    const sourceEmpty = typeof source[field] !== 'string' || !source[field].trim();
    const outputPopulated = typeof output[field] === 'string' && Boolean(output[field].trim());
    if (sourceEmpty && outputPopulated) return 'disallowed_claim';
  }
  return null;
};
