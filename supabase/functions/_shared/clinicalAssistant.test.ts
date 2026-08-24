import {
  hasMeaningfulCurrentNote,
  hasOnlyAllowedEvidenceRefs,
  isClinicalAssistantActionAllowed,
  normalizeCurrentNote,
  validateClinicalNoteDraftBoundary,
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

Deno.test('SOAP draft cannot populate a source-empty field', () => {
  const populated = { subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' };
  for (const field of Object.keys(populated) as (keyof typeof populated)[]) {
    const source = {
      noteFormat: 'soap' as const, clinicalNote: null,
      subjective: populated.subjective, objective: populated.objective,
      assessment: populated.assessment, plan: populated.plan,
      [field]: '   ',
    };
    const output = { noteFormat: 'soap', evidenceRefs: ['CURRENT_NOTE'], ...populated };
    assert(validateClinicalNoteDraftBoundary(source, output) === 'disallowed_claim', `${field} was populated from an empty source field`);
  }
});

Deno.test('SOAP populated fields may be rewritten and empty fields may remain null or empty', () => {
  const source = {
    noteFormat: 'soap' as const, clinicalNote: null,
    subjective: 'Original S', objective: 'Original O', assessment: null, plan: '   ',
  };
  const output = {
    noteFormat: 'soap', evidenceRefs: ['CURRENT_NOTE'],
    subjective: 'Rewritten S', objective: 'Short O', assessment: null, plan: '',
  };
  assert(validateClinicalNoteDraftBoundary(source, output) === null, 'Safe SOAP rewrite was rejected');
});

Deno.test('draft note format and CURRENT_NOTE evidence remain locked', () => {
  const source = {
    noteFormat: 'soap' as const, clinicalNote: null,
    subjective: 'S', objective: null, assessment: null, plan: null,
  };
  assert(validateClinicalNoteDraftBoundary(source, { noteFormat: 'free_text', evidenceRefs: ['CURRENT_NOTE'] }) === 'invalid_shape', 'Note format change was accepted');
  assert(validateClinicalNoteDraftBoundary(source, { noteFormat: 'soap', evidenceRefs: ['V1'] }) === 'invalid_evidence_ref', 'Unknown evidence was accepted');
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
