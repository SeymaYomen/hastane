export type PreVisitBrief = {
  summary: string;
  keyPoints: Array<{ text: string; evidenceRefs: string[] }>;
  followUp: { required: boolean; date: string | null; note: string | null };
  limitations: string[];
};

export type ClinicalAssistantSummary = {
  summary: string;
  keyPoints: Array<{ text: string; evidenceRefs: string[] }>;
  limitations: string[];
};

export type ClinicalAssistantCurrentNote = {
  noteFormat: 'free_text' | 'soap';
  clinicalNote: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
};

export type ClinicalAssistantDraft = {
  noteFormat: 'free_text' | 'soap';
  freeTextDraft: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  evidenceRefs: string[];
  limitations: string[];
};
