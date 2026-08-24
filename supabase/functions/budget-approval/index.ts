import { createClient } from 'npm:@supabase/supabase-js@2';

const admin = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const sha256 = async (value: string) => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const page = (title: string, content: string) => new Response(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>
body{margin:0;background:#f4f7fb;color:#172033;font-family:Arial,sans-serif}.card{max-width:640px;margin:28px auto;padding:24px;background:#fff;border-radius:18px;box-shadow:0 8px 28px #17203318}h1{margin:0 0 8px;font-size:25px}.muted{color:#64748b}.item{padding:14px 0;border-top:1px solid #e2e8f0}.row{display:flex;justify-content:space-between;gap:16px}.choice{display:flex;gap:10px;margin-top:10px}.approve{color:#047857}.reject{color:#b91c1c}textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:10px;font:inherit}button{width:100%;margin-top:18px;padding:14px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-size:16px;font-weight:bold}.total{font-size:20px;font-weight:bold;padding-top:18px}.notice{padding:12px;background:#eff6ff;border-radius:10px;color:#1e40af}@media(max-width:700px){.card{margin:0;border-radius:0;min-height:100vh}}
</style></head><body><main class="card">${content}</main></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

const errorPage = (message: string) => page('Enlace no disponible', `<h1>Enlace no disponible</h1><p class="muted">${escapeHtml(message)}</p>`);

const notifyTechnicians = async (db: ReturnType<typeof createClient>, budget: any, order: any, type: string, title: string, body: string) => {
  const { data: technicians } = await db.from('users').select('id').eq('workshop_id', budget.workshop_id).eq('role', 'technician');
  if (!technicians?.length) return;
  await db.from('user_notifications').insert(technicians.map((technician: { id: string }) => ({
    recipient_user_id: technician.id,
    workshop_id: budget.workshop_id,
    work_order_id: budget.work_order_id,
    event_key: `budget-response:${budget.id}:${technician.id}`,
    type,
    title,
    body,
    metadata: { budget_id: budget.id, order_code: order.code, version: budget.version },
  })));
};

Deno.serve(async (request) => {
  const url = new URL(request.url);
  const token = request.method === 'GET' ? url.searchParams.get('token') : null;
  const form = request.method === 'POST' ? await request.formData() : null;
  const submittedToken = form?.get('token');
  const rawToken = typeof token === 'string' ? token : typeof submittedToken === 'string' ? submittedToken : '';
  if (!rawToken) return errorPage('Falta el código de aprobación.');

  const db = admin();
  const tokenHash = await sha256(rawToken);
  const { data: budget } = await db.from('budget_approvals').select('*').eq('token_hash', tokenHash).maybeSingle();
  if (!budget) return errorPage('Este enlace no es válido.');
  if (budget.status !== 'sent') return errorPage('Este presupuesto ya fue respondido o reemplazado.');
  if (!budget.expires_at || new Date(budget.expires_at).getTime() < Date.now()) {
    await db.from('budget_approvals').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', budget.id);
    return errorPage('Este enlace de aprobación venció. Solicita uno nuevo al taller.');
  }

  const { data: order } = await db.from('work_orders').select('id, code, description').eq('id', budget.work_order_id).single();
  if (!order) return errorPage('La orden ya no está disponible.');
  const items = Array.isArray(budget.items) ? budget.items : [];

  if (request.method === 'GET') {
    const rows = items.map((item: any, index: number) => {
      const id = escapeHtml(item.id || index + 1);
      const description = escapeHtml(item.description || 'Concepto');
      const quantity = Number(item.quantity || 0);
      const total = Number(item.total || 0).toFixed(2);
      return `<section class="item"><div class="row"><strong>${description}</strong><strong>$${total}</strong></div><span class="muted">Cantidad: ${quantity}</span><div class="choice"><label class="approve"><input required type="radio" name="item_${id}" value="approved"> Aprobar</label><label class="reject"><input type="radio" name="item_${id}" value="rejected"> No aprobar</label></div></section>`;
    }).join('');
    return page('Aprobar presupuesto', `<h1>Presupuesto de mantenimiento</h1><p class="muted">Orden ${escapeHtml(order.code)} · ${escapeHtml(order.description)}</p><p class="notice">Revisa cada trabajo o repuesto y registra tu decisión.</p><form method="post"><input type="hidden" name="token" value="${escapeHtml(rawToken)}">${rows}<p class="total">Total propuesto: $${Number(budget.total_cost).toFixed(2)}</p><label>Comentario opcional</label><textarea name="comment" rows="3" maxlength="1000" placeholder="Escribe una observación para el taller"></textarea><button type="submit">Enviar decisión</button></form>`);
  }

  if (request.method !== 'POST') return errorPage('Método no permitido.');
  const decisions = items.map((item: any, index: number) => {
    const id = String(item.id || index + 1);
    const choice = form?.get(`item_${id}`);
    return { item_id: id, decision: choice === 'approved' ? 'approved' : 'rejected' };
  });
  const approved = decisions.filter((decision) => decision.decision === 'approved').length;
  const status = approved === decisions.length ? 'approved' : approved === 0 ? 'rejected' : 'partial';
  const approvalStatus = status === 'approved' ? 'approved' : status === 'partial' ? 'partial' : 'rejected';
  const comment = typeof form?.get('comment') === 'string' ? String(form?.get('comment')).trim().slice(0, 1000) : null;
  const now = new Date().toISOString();
  const { data: updated, error } = await db.from('budget_approvals')
    .update({ status, decisions, client_comment: comment || null, responded_at: now, updated_at: now })
    .eq('id', budget.id).eq('status', 'sent').select().maybeSingle();
  if (error || !updated) return errorPage('No se pudo registrar la decisión. Intenta nuevamente o contacta al taller.');

  await db.from('work_orders').update({ approval_required: true, approval_status: approvalStatus }).eq('id', budget.work_order_id);
  await db.from('work_order_events').insert({
    work_order_id: budget.work_order_id, workshop_id: budget.workshop_id,
    event_type: 'client_budget_response', detail: { budget_id: budget.id, status, decisions, comment },
  });
  const titles: Record<string, [string, string, string]> = {
    approved: ['budget_approved', 'Cliente aprobó el presupuesto', `El cliente aprobó todos los conceptos de la orden ${order.code}.`],
    partial: ['budget_partial', 'Cliente aprobó parcialmente', `El cliente aprobó ${approved} de ${decisions.length} conceptos de la orden ${order.code}.`],
    rejected: ['budget_rejected', 'Cliente rechazó el presupuesto', `El cliente rechazó los conceptos de la orden ${order.code}.`],
  };
  const [type, title, body] = titles[status];
  await notifyTechnicians(db, budget, order, type, title, body);
  return page('Decisión registrada', `<h1>Gracias</h1><p>${escapeHtml(status === 'approved' ? 'Tu presupuesto fue aprobado.' : status === 'partial' ? 'Tu aprobación parcial fue enviada.' : 'Tu decisión fue enviada.')}</p><p class="muted">El taller revisará tu respuesta y se comunicará contigo si es necesario.</p>`);
});
