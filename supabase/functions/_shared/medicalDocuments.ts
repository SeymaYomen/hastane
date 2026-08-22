import { createClient } from 'npm:@supabase/supabase-js@2';

export const BUCKET = 'medical-documents';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const publishableKey = () => {
  const encoded = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (encoded) {
    try {
      const keys = JSON.parse(encoded) as Record<string, unknown>;
      const key = keys.default ?? keys.publishable ?? keys.anon;
      if (typeof key === 'string' && key) return key;
    } catch { /* Fall through to the legacy environment key. */ }
  }
  return Deno.env.get('SUPABASE_ANON_KEY');
};

export const authenticate = async (request: Request) => {
  const authorization = request.headers.get('Authorization');
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = publishableKey();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, 'Oturum bulunamadı.');
  if (!url || !anonKey || !serviceKey) throw new HttpError(503, 'Belge servisi yapılandırması eksik.');
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });
  const { data, error } = await caller.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'Oturum doğrulanamadı.');
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: roleRow, error: roleError } = await admin.from('user_roles')
    .select('role').eq('user_id', data.user.id).single();
  if (roleError || !['patient', 'doctor'].includes(roleRow?.role)) {
    throw new HttpError(403, 'Belge işlemi için yetkiniz bulunmuyor.');
  }
  return { userId: data.user.id, role: roleRow.role as 'patient' | 'doctor', admin };
};

export const uuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const safeFailure = (error: unknown) => error instanceof HttpError
  ? error : new HttpError(500, 'Belge işlemi tamamlanamadı. Lütfen tekrar deneyin.');
