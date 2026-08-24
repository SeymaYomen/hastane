import {
  AIProviderPrivacyError,
  assertNoForbiddenAIProviderKeys,
  buildDoctorBriefProviderContext,
  buildClinicalAssistantDraftProviderContext,
  buildClinicalAssistantSummaryProviderContext,
} from './aiPrivacy.ts';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test('doctor brief provider context explicitly includes only historical clinical fields', () => {
  const context = {
    appointment_id: '11111111-1111-4111-8111-111111111111',
    patient_name: 'Patient Name',
    past_visits: [{
      ref: 'V1',
      date: '2026-08-20',
      noteFormat: 'soap' as const,
      clinicalNote: null,
      subjective: 'V1 subjective',
      objective: 'V1 objective',
      assessment: 'V1 assessment',
      plan: 'V1 plan',
      followUpRequired: true,
      followUpDate: '2026-09-20',
      followUpNote: 'Server-only deterministic follow-up',
    }, {
      ref: 'V2',
      date: '2026-08-10',
      noteFormat: 'free_text' as const,
      clinicalNote: 'V2 clinical note',
      subjective: null,
      objective: null,
      assessment: null,
      plan: null,
      followUpRequired: false,
      followUpDate: null,
      followUpNote: null,
    }],
  };

  const providerContext = buildDoctorBriefProviderContext(context);
  assert(providerContext.pastVisits[0].ref === 'V1', 'V1 reference was not preserved');
  assert(providerContext.pastVisits[1].clinicalNote === 'V2 clinical note', 'V2 clinical content was not preserved');
  assert(
    JSON.stringify(providerContext) === JSON.stringify({
      pastVisits: [
        {
          ref: 'V1', date: '2026-08-20', noteFormat: 'soap', clinicalNote: null,
          subjective: 'V1 subjective', objective: 'V1 objective', assessment: 'V1 assessment', plan: 'V1 plan',
        },
        {
          ref: 'V2', date: '2026-08-10', noteFormat: 'free_text', clinicalNote: 'V2 clinical note',
          subjective: null, objective: null, assessment: null, plan: null,
        },
      ],
    }),
    'Provider context did not match the exact allowlisted schema',
  );
});

Deno.test('Clinical Assistant contexts use exact summary and CURRENT_NOTE allowlists', () => {
  const record = {
    ref: 'V1', date: '2026-08-20', noteFormat: 'free_text' as const,
    clinicalNote: 'clinical', subjective: null, objective: null, assessment: null, plan: null,
  };
  const summary = buildClinicalAssistantSummaryProviderContext([{ ...record, appointment_id: 'not-forwarded' } as typeof record]);
  const draft = buildClinicalAssistantDraftProviderContext({
    noteFormat: 'soap', clinicalNote: null, subjective: 's', objective: '', assessment: '', plan: '',
  });
  assert(JSON.stringify(summary) === JSON.stringify({ records: [record] }), 'Summary allowlist mismatch');
  assert(JSON.stringify(draft) === JSON.stringify({ currentNote: {
    ref: 'CURRENT_NOTE', noteFormat: 'soap', clinicalNote: null,
    subjective: 's', objective: '', assessment: '', plan: '',
  } }), 'Draft allowlist mismatch');
});

Deno.test('provider privacy assertion rejects forbidden keys at any depth', () => {
  for (const payload of [
    { patient_name: 'Patient Name' },
    { safe: { appointmentId: '11111111-1111-4111-8111-111111111111' } },
    { safe: [{ document_id: '22222222-2222-4222-8222-222222222222' }] },
  ]) {
    let rejected = false;
    try {
      assertNoForbiddenAIProviderKeys(payload);
    } catch (error) {
      rejected = error instanceof AIProviderPrivacyError;
    }
    assert(rejected, 'Forbidden provider key was not rejected');
  }
});
