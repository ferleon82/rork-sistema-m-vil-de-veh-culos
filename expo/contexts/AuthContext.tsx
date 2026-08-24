import createContextHook from '@nkzw/create-context-hook';
import { useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { User, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

WebBrowser.maybeCompleteAuthSession();

type DbUser = Database['public']['Tables']['users']['Row'];

const mapDbUserToUser = (dbUser: DbUser): User => ({
  id: dbUser.id,
  email: dbUser.email,
  name: dbUser.name,
  role: dbUser.role,
  countryCode: dbUser.country_code,
  phone: dbUser.phone || undefined,
  clientId: dbUser.client_id || undefined,
  workshopId: dbUser.workshop_id || undefined,
});

type AppTabName = 'index' | 'vehicles' | 'work-orders' | 'workshops' | 'clients' | 'users' | 'settings';

type RolePermissions = {
  canManageWorkshops: boolean;
  canManageUsers: boolean;
  canManageVehicles: boolean;
  canManageClients: boolean;
  canManageWorkOrders: boolean;
  canAssignWorkOrders: boolean;
  viewOnlyAssignedWorkOrders: boolean;
  accessibleTabs: readonly AppTabName[];
  assignableRoles: readonly UserRole[];
};

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: { canManageWorkshops: true, canManageUsers: true, canManageVehicles: true, canManageClients: true, canManageWorkOrders: true, canAssignWorkOrders: true, viewOnlyAssignedWorkOrders: false, accessibleTabs: ['index', 'vehicles', 'work-orders', 'workshops', 'clients', 'users', 'settings'], assignableRoles: ['admin', 'technician', 'mechanic'] },
  technician: { canManageWorkshops: false, canManageUsers: true, canManageVehicles: true, canManageClients: true, canManageWorkOrders: true, canAssignWorkOrders: true, viewOnlyAssignedWorkOrders: false, accessibleTabs: ['index', 'vehicles', 'work-orders', 'clients', 'users'], assignableRoles: ['mechanic'] },
  mechanic: { canManageWorkshops: false, canManageUsers: false, canManageVehicles: false, canManageClients: false, canManageWorkOrders: false, canAssignWorkOrders: false, viewOnlyAssignedWorkOrders: true, accessibleTabs: ['index', 'work-orders'], assignableRoles: [] },
};

const getPermissions = (role?: UserRole): RolePermissions => role ? ROLE_PERMISSIONS[role] : ROLE_PERMISSIONS.mechanic;

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const loadProfile = async (authUserId: string) => {
    let { data, error } = await supabase.from('users').select('*').eq('auth_user_id', authUserId).single();

    if (error || !data) {
      const { error: linkError } = await supabase.functions.invoke('manage-users', { body: { action: 'link-self' } });
      if (!linkError) {
        const retry = await supabase.from('users').select('*').eq('auth_user_id', authUserId).single();
        data = retry.data;
        error = retry.error;
      }
    }

    if (error || !data) {
      setUser(null);
      return false;
    }
    setUser(mapDbUserToUser(data));
    return true;
  };

  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session && isMounted) await loadProfile(data.session.user.id);
      if (isMounted) setIsLoading(false);
    };
    void restoreSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        return;
      }
      void loadProfile(session.user.id);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inLoginScreen = segments[0] === 'login';
    if (!user && !inLoginScreen) router.replace('/login' as any);
    else if (user && inLoginScreen) router.replace('/(tabs)' as any);
  }, [user, segments, isLoading, router]);

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return { success: false, error: 'No se pudo iniciar sesión con Google.' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return { success: false, error: 'El inicio de sesión fue cancelado.' };

    const callbackUrl = new URL(result.url);
    const code = callbackUrl.searchParams.get('code');
    const hashParams = new URLSearchParams(callbackUrl.hash.slice(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    const sessionResult = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : accessToken && refreshToken
        ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        : { data: { session: null }, error: new Error('Google no devolvió una sesión válida.') };

    if (sessionResult.error || !sessionResult.data.session) {
      return { success: false, error: 'No se pudo validar la sesión con Google.' };
    }

    const hasProfile = await loadProfile(sessionResult.data.session.user.id);
    if (!hasProfile) {
      await supabase.auth.signOut();
      return { success: false, error: 'Tu cuenta de Google no está autorizada para acceder a la aplicación.' };
    }
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.replace('/login' as any);
  };

  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';
  const isMechanic = user?.role === 'mechanic';

  return { user, isLoading, loginWithGoogle, logout, isAdmin, isTechnician, isMechanic, permissions: getPermissions(user?.role) };
});

export type { RolePermissions, AppTabName };
