export type PreVisitBrief = {
  summary: string;
  keyPoints: Array<{ text: string; evidenceRefs: string[] }>;
  followUp: { required: boolean; date: string | null; note: string | null };
  limitations: string[];
};
