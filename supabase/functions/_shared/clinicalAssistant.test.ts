import {
  hasMeaningfulCurrentNote,
  hasOnlyAllowedEvidenceRefs,
  isClinicalAssistantActionAllowed,
  normalizeCurrentNote,
  type ClinicalAssistantStatus,
} from './clinicalAssistant.ts';

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };

Deno.test('Clinical Assistant status/action matrix is enforced', () => {
  const expected: Record<ClinicalAssistantStatus, [boolean, boolean]> = {
    confirmed: [true, false],
    in_progress: [true, true],
    completed: [true, false],
    cancelled: [false, false],
    no_show: [false, false],
  };
  for (const [status, [summary, draft]] of Object.entries(expected) as [ClinicalAssistantStatus, [boolean, boolean]][]) {
    assert(isClinicalAssistantActionAllowed(status, 'summary') === summary, `${status} summary mismatch`);
    assert(isClinicalAssistantActionAllowed(status, 'clinical_note_draft') === draft, `${status} draft mismatch`);
  }
});

Deno.test('empty drafts are rejected before provider use and extra input keys are rejected', () => {
  const empty = normalizeCurrentNote({ noteFormat: 'soap', clinicalNote: null, subjective: '', objective: null, assessment: null, plan: '' });
  assert(empty && !hasMeaningfulCurrentNote(empty), 'Empty SOAP note was considered meaningful');
  assert(normalizeCurrentNote({ noteFormat: 'free_text', clinicalNote: 'text', subjective: null, objective: null, assessment: null, plan: null, patient_name: 'x' }) === null, 'Extra input key was accepted');
});

Deno.test('unknown evidence references are rejected', () => {
  const allowed = new Set(['CURRENT_VISIT', 'V1', 'V2']);
  assert(hasOnlyAllowedEvidenceRefs(['V1'], allowed), 'Known reference was rejected');
  assert(!hasOnlyAllowedEvidenceRefs(['V3'], allowed), 'Unknown reference was accepted');
  assert(!hasOnlyAllowedEvidenceRefs([], allowed), 'Empty evidence references were accepted');
});
