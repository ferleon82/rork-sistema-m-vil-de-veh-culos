import { createClient } from 'npm:@supabase/supabase-js@2';

type Role = 'admin' | 'technician' | 'mechanic';
type ManagedUser = {
  name: string;
  email: string;
  role: Role;
  countryCode: string;
  phone?: string;
  clientId?: string;
  workshopId?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const readBearerToken = (request: Request) => request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');

const syncWorkshopResponsible = async (
  admin: ReturnType<typeof createClient>,
  profile: { id: string; role: Role; workshop_id: string | null },
  previousProfile?: { role: Role; workshop_id: string | null },
) => {
  // When a technician is newly assigned or moved to a workshop, that workshop
  // automatically receives the technician as its responsible lead. If the
  // technician moved away, clear the old workshop only when they were its lead.
  const movedAwayFromWorkshop = previousProfile?.role === 'technician'
    && previousProfile.workshop_id
    && (profile.role !== 'technician' || previousProfile.workshop_id !== profile.workshop_id);
  if (movedAwayFromWorkshop) {
    const { error } = await admin
      .from('workshops')
      .update({ owner_id: null })
      .eq('id', previousProfile.workshop_id)
      .eq('owner_id', profile.id);
    if (error) throw error;
  }

  const becameOrMovedTechnician = profile.role === 'technician'
    && !!profile.workshop_id
    && (!previousProfile || previousProfile.role !== 'technician' || previousProfile.workshop_id !== profile.workshop_id);
  if (becameOrMovedTechnician) {
    const { error } = await admin
      .from('workshops')
      .update({ owner_id: profile.id })
      .eq('id', profile.workshop_id);
    if (error) throw error;
  }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const token = readBearerToken(request);
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);

  const body = await request.json();
  const action = body?.action;
  const requestedUser = body?.user as ManagedUser | undefined;

  if (action === 'link-self') {
    const email = authData.user.email?.trim().toLowerCase();
    if (!email) return json({ error: 'Missing verified email' }, 400);
    const { data: profile, error } = await admin
      .from('users')
      .select('id, auth_user_id')
      .eq('email', email)
      .maybeSingle();
    if (error || !profile || (profile.auth_user_id && profile.auth_user_id !== authData.user.id)) {
      return json({ error: 'No authorized profile found' }, 403);
    }
    const { error: updateError } = await admin
      .from('users')
      .update({ auth_user_id: authData.user.id })
      .eq('id', profile.id);
    return updateError ? json({ error: 'Could not link profile' }, 400) : json({ success: true });
  }

  const { data: caller, error: callerError } = await admin
    .from('users')
    .select('*')
    .eq('auth_user_id', authData.user.id)
    .single();
  if (callerError || !caller) return json({ error: 'Forbidden' }, 403);

  const canManage = (target: { role: Role; workshop_id: string | null }) =>
    caller.role === 'admin' || (caller.role === 'technician' && target.role === 'mechanic' && target.workshop_id === caller.workshop_id);

  if (action === 'list') {
    let query = admin.from('users').select('*').order('created_at', { ascending: false });
    if (caller.role === 'technician') query = query.eq('role', 'mechanic').eq('workshop_id', caller.workshop_id);
    if (caller.role === 'mechanic') return json({ error: 'Forbidden' }, 403);
    const { data, error } = await query;
    return error ? json({ error: 'Could not load users' }, 400) : json({ users: data });
  }

  if (action === 'create') {
    if (!requestedUser?.name || !requestedUser.email) {
      return json({ error: 'Invalid user data' }, 400);
    }
    if (caller.role === 'mechanic' || (caller.role === 'technician' && requestedUser.role !== 'mechanic')) {
      return json({ error: 'Forbidden' }, 403);
    }

    const workshopId = caller.role === 'technician'
      ? caller.workshop_id
      : requestedUser.workshopId?.trim() || null;
    if ((requestedUser.role === 'technician' || requestedUser.role === 'mechanic') && !workshopId) {
      return json({ error: 'Los técnicos y mecánicos deben tener una mecánica asignada.' }, 400);
    }

    const profile = {
      name: requestedUser.name.trim(),
      email: requestedUser.email.trim().toLowerCase(),
      role: requestedUser.role,
      country_code: requestedUser.countryCode,
      phone: requestedUser.phone || null,
      client_id: requestedUser.clientId || null,
      workshop_id: workshopId,
    };

    const { data: existingProfile } = await admin.from('users').select('id').eq('email', profile.email).maybeSingle();
    if (existingProfile) return json({ error: 'A profile already exists for this email' }, 409);

    const write = admin.from('users').insert(profile).select().single();
    const { data, error } = await write;
    if (error) return json({ error: 'Could not create profile' }, 400);
    try {
      await syncWorkshopResponsible(admin, data);
    } catch {
      return json({ error: 'El usuario fue creado, pero no se pudo asignar como responsable de la mecánica.' }, 400);
    }
    return json({ user: data }, 201);
  }

  const userId = body?.userId as string | undefined;
  if (!userId) return json({ error: 'Missing user id' }, 400);
  const { data: target, error: targetError } = await admin.from('users').select('*').eq('id', userId).single();
  if (targetError || !target || !canManage(target)) return json({ error: 'Forbidden' }, 403);

  if (action === 'update') {
    if (!requestedUser?.name || !requestedUser.email || !requestedUser.role) return json({ error: 'Invalid user data' }, 400);
    if (caller.role === 'technician' && requestedUser.role !== 'mechanic') return json({ error: 'Forbidden' }, 403);
    const email = requestedUser.email.trim().toLowerCase();
    const emailChanged = email !== target.email;
    const workshopId = caller.role === 'technician'
      ? caller.workshop_id
      : requestedUser.workshopId?.trim() || null;
    if ((requestedUser.role === 'technician' || requestedUser.role === 'mechanic') && !workshopId) {
      return json({ error: 'Los técnicos y mecánicos deben tener una mecánica asignada.' }, 400);
    }
    const updates = {
      name: requestedUser.name.trim(), email, role: requestedUser.role,
      country_code: requestedUser.countryCode, phone: requestedUser.phone || null, client_id: requestedUser.clientId || null,
      workshop_id: workshopId,
      // A Google identity owns its email address. Changing the authorized email
      // therefore revokes the old Google link; the person must sign in with the
      // new Google account, and link-self will attach it to this same profile.
      ...(emailChanged && target.auth_user_id ? { auth_user_id: null } : {}),
    };
    const { data, error } = await admin.from('users').update(updates).eq('id', userId).select().single();
    if (error || !data) {
      // Return a user-safe reason to the authorized manager. This avoids a
      // generic 400 that cannot be diagnosed from the mobile app.
      if (error?.code === '23505') {
        return json({ error: 'Ya existe un usuario autorizado con ese correo.' }, 409);
      }
      return json({ error: error?.message || 'No se pudo actualizar el perfil.' }, 400);
    }
    try {
      await syncWorkshopResponsible(admin, data, target);
    } catch {
      return json({ error: 'El usuario fue actualizado, pero no se pudo sincronizar el responsable de la mecánica.' }, 400);
    }
    return json({
      user: data,
      requiresGoogleSignIn: emailChanged && !!target.auth_user_id,
    });
  }

  if (action === 'delete') {
    const { count: createdOrders } = await admin.from('work_orders').select('*', { count: 'exact', head: true }).eq('created_by', userId);
    if (createdOrders) return json({ error: 'No se puede eliminar un usuario que creó órdenes de trabajo.' }, 409);
    await admin.from('work_orders').update({ assigned_to: null }).eq('assigned_to', userId);
    if (target.auth_user_id) {
      const { error } = await admin.auth.admin.deleteUser(target.auth_user_id);
      if (error) return json({ error: 'Could not delete account' }, 400);
    }
    const { error } = await admin.from('users').delete().eq('id', userId);
    return error ? json({ error: 'Could not delete profile' }, 400) : json({ success: true });
  }

  return json({ error: 'Unknown action' }, 400);
});
