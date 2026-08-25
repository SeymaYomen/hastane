import { supabase } from '../../lib/supabase';

export type AdminAuditEntry = {
  id: string;
  actor_user_id: string | null;
  actor_display_identity: string;
  action: string;
  target_user_id: string | null;
  target_display_identity: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminAuditQuery = {
  action?: string;
  limit?: number;
  offset?: number;
};

export const getAdminAuditEntries = async (
  query: AdminAuditQuery = {},
): Promise<AdminAuditEntry[]> => {
  const limit = Math.min(50, Math.max(1, Math.trunc(query.limit ?? 25)));
  const offset = Math.min(10000, Math.max(0, Math.trunc(query.offset ?? 0)));
  const { data, error } = await supabase.rpc('admin_get_actions', {
    p_limit: limit,
    p_offset: offset,
    p_action: query.action?.trim() || null,
  });
  if (error) throw error;
  return (data ?? []) as AdminAuditEntry[];
};
