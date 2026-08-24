# Architecture Decisions

> Status: living decision record for the `Hastane/Güncelleme` branch.
>
> Purpose: preserve the non-negotiable security, clinical-safety, data-access, and lifecycle decisions that future Codex tasks must not silently weaken.
>
> This file documents architectural intent. Applied migrations must not be edited retroactively; changes to a locked decision require a new migration/code change and an explicit update to this document.

## 1. Cross-cutting invariants

These rules apply across patient, doctor, clinical-record, document, and AI features unless a later architecture decision explicitly supersedes them.

- **The browser is not trusted for identity or ownership.** Patient ID, doctor ID, role, ownership, and access scope are derived server-side from the verified authenticated user and existing relationships.
- **Authorization is relationship-based.** Knowing a UUID must never grant access. Doctor access must resolve through the assigned appointment/doctor relationship; patient access must resolve through `auth.uid()` ownership.
- **RLS stays enabled on sensitive application tables.** Avoid broad direct table/storage grants to `public`, `anon`, or `authenticated`; prefer narrow RPCs and narrowly authorized Edge Functions.
- **`SECURITY DEFINER` functions use `set search_path = ''`** and fully qualified object names. Server-only mutation helpers are not executable by normal browser roles.
- **Service-role credentials are server-only.** They may exist in hosted Edge Functions when needed, but never in React, `VITE_*`, browser storage, logs, responses, or committed files.
- **No silent destructive lifecycle.** Clinical/security-sensitive records are not deleted or rewritten without an explicit lifecycle/audit design. Where a V1 feature is immutable, the UI must not expose edit/delete/relink controls.
- **Logs are metadata-only.** Do not log clinical text, SOAP content, file contents, signed URLs, storage paths, JWTs, API keys, TCKN, phone, email, or other unnecessary identifiers.
- **Synthetic data is used for live validation.** Test data must be clearly labeled as synthetic and must not be treated as real clinical data.
- **Previously applied migrations are never edited.** New behavior ships through a new migration.
- **AI is assistive, on-demand, and non-autonomous.** It must not silently write clinical records, diagnose, prescribe, or replace clinician judgment.

---

## 2. V2A — Prescription System V1 — LOCKED

### Core model

- Prescriptions are normalized into `prescriptions` (header) and `prescription_items` (medication rows).
- A completed appointment has at most one prescription header; items belong to that prescription.
- Doctor/patient identity is derived server-side from the authenticated doctor and appointment relationship.

### Access and lifecycle

- Only the assigned/author doctor may create or update the prescription for their own **completed** appointment.
- Patients have **read-only** access to their own prescription data through a narrow patient-safe read model.
- Patients cannot create, edit, or delete prescription items.
- Cross-doctor and cross-patient access must fail even when a UUID is known.

### Clinical-safety boundary

- No AI medication generation, dose generation, treatment recommendation, or autonomous prescription creation.
- Prescription data is not implicitly added to AI provider context. Any future AI use requires an explicit architecture decision.

### Implementation rule

- Updating a prescription is transactional: the authorized doctor saves the intended item set for that completed appointment; the patient never receives write access.

---

## 3. V2B — Laboratory / Test System V1 — LOCKED

### Core model

- `lab_orders` is a grouping/header object and has **no order-level status**.
- Each `lab_order_item` has its own status:
  - `requested`
  - `resulted`
  - `cancelled`
- Allowed V1 transitions only:
  - `requested -> resulted`
  - `requested -> cancelled`
- `resulted` and `cancelled` items are immutable in V1.

### Request and result rules

- Assigned doctor may request tests only for their own appointment in:
  - `in_progress`
  - `completed`
- Results may be entered later while the item remains `requested`, including after the appointment has become completed.
- A resulted item requires at least one real result value: numeric or nonblank text.
- Existing items are append-only through normal workflow; adding tests must not replace or delete prior resulted/cancelled items.

### Result representation

V1 supports raw result data only:

- numeric result
- text result
- unit
- numeric reference min/max
- free reference text
- result note

### Clinical-safety boundary

- No automatic `high / low / normal` classification.
- No diagnostic interpretation or risk statement.
- No red/green medical interpretation styling.
- No LIS/HBYS integration, imaging workflow, lab-technician role, or AI interpretation in V1.

### Patient boundary

- Patient sees their own requested/resulted/cancelled items read-only.
- Patient cannot mutate test requests or results.
- No SOAP/private clinical note leakage through the patient lab read model.

---

## 4. V2C — Secure Medical Documents V1 — LOCKED

### Storage

- Dedicated bucket: `medical-documents`.
- Bucket is **private**.
- Maximum file size: **10 MB**.
- Allowed formats only:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
- No public URLs and no broad `storage.objects` policies for browser users.
- Object paths contain no patient/doctor names, TCKN, phone, email, or original filename.
- Object path is server-generated, UUID-based, e.g. `documents/<document_uuid>/file.png`.

### Upload lifecycle

- Statuses:
  - `pending`
  - `ready`
  - `failed`
- Upload is two-phase:
  1. create upload intent
  2. signed upload to exact server-generated path
  3. finalize on server
- Intent lifetime is **15 minutes**.
- Expired finalize attempt transitions `pending -> failed` with `failure_code = 'expired'`, and the object is removed if present.
- Abandoned pending intents are not shown as usable medical documents. Automated cleanup of never-finalized abandoned objects is a **future maintenance task**, not a claimed V1 capability.

### Server-side file validation

Finalize validates the actual uploaded bytes, not only browser metadata.

- Size must be `1..10 MB`.
- Extension/expected format must agree.
- Magic-byte signatures:
  - PDF: `%PDF-`
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47 0D 0A 1A 0A`
- Invalid objects become `failed` and are removed when possible.

**Magic-byte validation is not antivirus scanning.** V1 does not perform malware scanning, sandboxing, PDF sanitization, or active-content stripping, and the UI must never claim otherwise.

### Appointment sharing

- Document-to-appointment relationship is many-to-many through `medical_document_appointments`.
- A patient-uploaded document may be linked to **zero, one, or multiple** eligible appointments owned by that patient.
- Patient-shareable appointment statuses:
  - `confirmed`
  - `in_progress`
  - `completed`
- An unlinked patient document is valid personal archive data and must display: **“Bu belge herhangi bir randevuyla paylaşılmıyor.”**
- A doctor-uploaded document is linked to exactly one appointment and the patient is derived from that appointment.
- Doctor upload is allowed only for own:
  - `in_progress`
  - `completed`
- Doctor read is allowed only through own linked appointment in:
  - `confirmed`
  - `in_progress`
  - `completed`
- A doctor never gains access to the patient’s full document archive merely by treating that patient.

### Immutability

Once a document becomes `ready` in V1, the following are immutable through normal workflow:

- category
- title
- description
- original filename metadata
- storage path
- patient/uploader identity
- appointment links
- file bytes

There is no normal edit, delete, replace, or relink UI/API in V1. Future amendment/archive/delete behavior requires a separate audited lifecycle design.

### Signed read access

- Read URLs are issued by an authorized Edge Function only after document access is checked.
- Signed URL TTL: **120 seconds**.
- Frontend cache: **memory-only, max 90 seconds**.
- Server-side quota: **20 signed-URL requests per user per 60-second window**.
- Audit event is named **`signed_url_issued`**, never `document_viewed`, because issuance does not prove the file was opened.
- Signed URLs, storage paths, tokens, and file contents are never written to the access log.

### AI boundary

- V2C files and metadata are not sent to Gemini/OpenAI in V1.
- No OCR, AI document interpretation, diagnosis, or AI report summary in V2C V1.

---

## 5. AI Foundation / Doctor Brief — EXISTING BASELINE

The existing `doctor-ai-brief` remains an independent feature and is not to be silently merged into future assistants.

- Doctor-only, on-demand generation.
- Assigned-appointment authorization is required.
- Provider calls use strict structured output and server-side validation.
- Existing brief workflow uses evidence references and safe follow-up construction from verified data.
- Provider timeout: approximately 45 seconds; frontend timeout: approximately 60 seconds.
- No automatic retry loops.
- Rate limiting is enforced server-side.
- `ai_usage` is metadata-only; patient clinical text, prompt text, and model response content are not logged.
- AI output is not automatically written into clinical tables.

### Mandatory privacy hardening before Clinical Assistant V1

Before expanding AI functionality, provider payload construction must be hardened and centralized.

Provider context must exclude unnecessary identifiers such as:

- patient name
- appointment UUID
- user UUID
- doctor UUID
- TCKN
- email
- phone
- price
- rating
- storage path
- document UUIDs / filenames

Only the minimum verified clinical content required for the feature may be sent.

For Gemini, prefer `x-goog-api-key` header rather than putting the API key in the request URL/query string.

A shared provider-context sanitizer should become the default entry point for all future AI features so forbidden fields cannot be reintroduced feature-by-feature.

---

## 6. Clinical Assistant V1 — PLANNED / ARCHITECTURE LOCKED, IMPLEMENTATION PENDING

### Product boundary

Clinical Assistant is a **documentation and review assistant**, not a diagnostic or treatment engine.

Planned separate Edge Function:

- `doctor-clinical-assistant`

Do not silently modify or replace `doctor-ai-brief` while implementing this feature.

### V1 actions

1. **Kayıtları Özetle**
   - Summarizes only verified, authorized records supplied in provider context.
   - Must use evidence references.

2. **Klinik Not Taslağı Oluştur**
   - Available only while the assigned appointment is `in_progress`.
   - Reorganizes/rewrites doctor-entered information into a clinical note or SOAP draft.
   - Must not fill clinical gaps with external medical knowledge.

`confirmed` appointments may use summary-only behavior.

**Open implementation decision before coding:** whether summary generation is also enabled for `completed` appointments. This must be explicitly decided in the implementation prompt rather than inferred by Codex.

No new clinical-note draft generation for `completed`, `cancelled`, or `no_show` appointments.

### Prohibited AI behavior

The Clinical Assistant must not generate or infer:

- a new diagnosis
- differential diagnosis
- “likely disease” claims
- medication names or doses
- treatment recommendations
- test/imaging/lab orders
- risk scores
- emergency disposition decisions
- direct patient treatment instructions

If a field such as SOAP `assessment` is not supported by verified source content, it may remain empty. **The model must not complete missing clinical reasoning merely to make the note look complete.**

### Allowed V1 provider context

Use only the minimum authorized information needed, such as:

- same doctor-patient relationship’s relevant completed historical visits
- current doctor-entered clinical/free-text/SOAP fields
- verified follow-up plan
- current appointment notes written by the doctor when required by the feature

### Excluded V1 provider context

Do not send:

- V2C document bytes or metadata
- OCR output
- document filenames
- prescription/medication data
- lab-result data for interpretation
- another doctor’s private clinical notes
- unrelated patient profile/contact data

Any future inclusion of these data domains requires a new architecture decision.

### Output contract

Use strict JSON schema, not free-form Markdown.

Summary output should include fields such as:

- `summary`
- `key_points[]`
- `evidence_refs[]`
- `limitations[]`

Clinical-note draft output should be schema-bound, e.g.:

- `note_format`
- `free_text_draft`

or SOAP fields:

- `subjective`
- `objective`
- `assessment`
- `plan`

plus:

- `evidence_refs[]`
- `limitations[]`

Evidence references must resolve only to supplied context identifiers such as `CURRENT_NOTE`, `V1`, `V2`, etc. Unknown references are rejected.

### Draft persistence rule

AI draft output is transient UI state only.

Flow:

`doctor input -> AI draft -> prominent warning -> Taslağı Forma Aktar -> normal form state -> doctor reviews/edits -> existing save/complete RPC`

- AI never writes directly to `visit_notes`.
- **“Taslağı Forma Aktar” does not mean clinical approval.**
- Doctor must still review and use the existing normal save/completion flow.

Prominent UI wording must communicate:

- **AI TASLAĞI**
- **Doktor kontrolü gereklidir**

This warning must not be hidden in a footer.

### AI usage/audit metadata

`ai_usage` may record safe metadata such as:

- `feature = clinical_assistant_summary`
- `feature = clinical_note_draft`
- provider/model
- token counts
- latency
- status/error code

If the product needs an “applied” event, it may record a metadata-only event such as `ai_draft_applied`.

Never store in `ai_usage`:

- prompt text
- SOAP text
- clinical note text
- AI response content
- patient clinical content

### Operational rules

Reuse proven AI Foundation controls:

- verified authenticated doctor
- assigned appointment only
- server-side rate limit (target V1: 5 requests/minute/doctor)
- backend timeout ~45 s
- frontend timeout ~60 s
- no automatic retry
- strict response validation
- safe Turkish errors
- no provider secret exposure

---

## 7. Deployment and change-control rules

For future Codex tasks touching these modules:

- Inspect current migrations/RPCs/Edge Functions before changing behavior.
- Create a **new migration** for database changes; never rewrite an applied migration.
- Build and run `git diff --check` before commit.
- Keep unrelated legacy errors separate; do not change unrelated files merely to silence them.
- Do not touch or commit:
  - `.bolt/BASLAT.bat`
  - `BASLAT.bat`
- Remote Supabase migration/deployment should be reviewed before manual application/deploy when the change affects security boundaries.
- Any change that weakens authorization, immutability, AI safety, privacy minimization, signed-access rules, or audit semantics requires an explicit architecture review and an update to this file.

---

## 8. Deferred / future architecture backlog

These are intentionally **not** claimed as current V1 capabilities:

- malware/antivirus scanning and quarantine for uploaded documents
- PDF sanitization / active-content stripping
- scheduled cleanup of abandoned expired `pending` document objects
- lab-technician role and LIS/HBYS integration
- document amendment/archive/delete lifecycle
- patient-controlled post-upload document re-sharing/relinking
- care-team/global chart-sharing model across doctors
- OCR/document ingestion into AI
- AI lab interpretation
- AI prescription generation
- autonomous diagnosis/treatment recommendations
- no-show prediction
- secure messaging / telemedicine / live queue

When one of these moves into implementation, create or extend an explicit architecture decision before coding.
