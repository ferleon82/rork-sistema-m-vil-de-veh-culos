import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const tokenFromRequest = (request: Request) => request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const createPublicToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};

const adminClient = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const ensureManagerForOrder = async (admin: ReturnType<typeof createClient>, request: Request, workOrderId: string) => {
  const token = tokenFromRequest(request);
  if (!token) return { error: 'Sesión no autorizada', status: 401 };
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return { error: 'Sesión no autorizada', status: 401 };

  const { data: caller } = await admin.from('users').select('id, role, workshop_id').eq('auth_user_id', auth.user.id).maybeSingle();
  const { data: order } = await admin.from('work_orders').select('*').eq('id', workOrderId).maybeSingle();
  if (!caller || !order) return { error: 'Orden no encontrada', status: 404 };
  if (caller.role !== 'admin' && (caller.role !== 'technician' || caller.workshop_id !== order.workshop_id)) {
    return { error: 'No tienes permiso para administrar este presupuesto', status: 403 };
  }
  return { caller, order };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const admin = adminClient();
  const body = await request.json().catch(() => null);
  const action = body?.action;
  const workOrderId = typeof body?.workOrderId === 'string' ? body.workOrderId : '';
  const budgetId = typeof body?.budgetId === 'string' ? body.budgetId : '';

  if (action === 'prepare') {
    const access = await ensureManagerForOrder(admin, request, workOrderId);
    if ('error' in access) return json({ error: access.error }, access.status);
    const { caller, order } = access;
    const items = Array.isArray(order.items) ? order.items : [];
    if (!order.workshop_id || items.length === 0) {
      return json({ error: 'Agrega al menos un trabajo o repuesto antes de solicitar aprobación.' }, 400);
    }

    const { data: latest } = await admin
      .from('budget_approvals')
      .select('version')
      .eq('work_order_id', order.id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = (latest?.version ?? 0) + 1;

    await admin
      .from('budget_approvals')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('work_order_id', order.id)
      .in('status', ['draft', 'sent']);

    const publicToken = createPublicToken();
    const tokenHash = await sha256(publicToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: approval, error } = await admin
      .from('budget_approvals')
      .insert({
        work_order_id: order.id,
        workshop_id: order.workshop_id,
        version,
        status: 'draft',
        items,
        total_cost: order.total_cost,
        notes: body?.notes?.trim() || null,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_by: caller.id,
      })
      .select()
      .single();
    if (error || !approval) return json({ error: error?.message || 'No se pudo preparar la aprobación.' }, 400);

    await admin.from('work_orders').update({ approval_required: true, approval_status: 'draft' }).eq('id', order.id);
    await admin.from('work_order_events').insert({
      work_order_id: order.id,
      workshop_id: order.workshop_id,
      actor_user_id: caller.id,
      event_type: 'budget_prepared',
      detail: { budget_id: approval.id, version },
    });

    const approvalUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/budget-approval?token=${publicToken}`;
    return json({ approval, approvalUrl });
  }

  if (action === 'mark-sent') {
    if (!budgetId) return json({ error: 'Falta el presupuesto' }, 400);
    const { data: budget } = await admin.from('budget_approvals').select('*').eq('id', budgetId).maybeSingle();
    if (!budget) return json({ error: 'Presupuesto no encontrado' }, 404);
    const access = await ensureManagerForOrder(admin, request, budget.work_order_id);
    if ('error' in access) return json({ error: access.error }, access.status);
    const { caller, order } = access;
    if (budget.status !== 'draft' && budget.status !== 'sent') return json({ error: 'Este presupuesto ya no puede enviarse.' }, 400);

    const now = new Date().toISOString();
    const { error } = await admin.from('budget_approvals').update({ status: 'sent', sent_at: now, updated_at: now }).eq('id', budget.id);
    if (error) return json({ error: 'No se pudo registrar el envío.' }, 400);
    await admin.from('work_orders').update({ approval_required: true, approval_status: 'pending' }).eq('id', order.id);
    await admin.from('work_order_events').insert({
      work_order_id: order.id,
      workshop_id: order.workshop_id,
      actor_user_id: caller.id,
      event_type: 'budget_sent',
      detail: { budget_id: budget.id, version: budget.version },
    });
    return json({ success: true });
  }

  return json({ error: 'Acción no reconocida' }, 400);
});
