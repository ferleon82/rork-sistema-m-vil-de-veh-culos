import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import * as Linking from 'expo-linking';
import { useRouter, useSegments } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { User, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

const STORAGE_KEY = '@auth_user';
const explicitAuthRedirectUrl = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
const REFRESH_INTERVAL_MS = 30000;

WebBrowser.maybeCompleteAuthSession();

type DbUser = Database['public']['Tables']['users']['Row'];

const mapDbUserToUser = (dbUser: DbUser): User => ({
  id: dbUser.id,
  authUserId: dbUser.auth_user_id || undefined,
  email: dbUser.email,
  name: dbUser.name,
  role: dbUser.role,
  countryCode: dbUser.country_code,
  phone: dbUser.phone || undefined,
  clientId: dbUser.client_id || undefined,
  workshopId: dbUser.workshop_id || undefined,
  status: (dbUser.status as User['status']) || 'pending',
  lastLoginAt: dbUser.last_login_at,
  createdAt: dbUser.created_at,
  updatedAt: dbUser.updated_at,
});

type AppTabName =
  | 'index'
  | 'vehicles'
  | 'work-orders'
  | 'workshops'
  | 'clients'
  | 'users'
  | 'settings';

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
  admin: {
    canManageWorkshops: true,
    canManageUsers: true,
    canManageVehicles: true,
    canManageClients: true,
    canManageWorkOrders: true,
    canAssignWorkOrders: true,
    viewOnlyAssignedWorkOrders: false,
    accessibleTabs: ['index', 'vehicles', 'work-orders', 'workshops', 'clients', 'users', 'settings'],
    assignableRoles: ['admin', 'technician', 'mechanic'],
  },
  technician: {
    canManageWorkshops: false,
    canManageUsers: true,
    canManageVehicles: true,
    canManageClients: true,
    canManageWorkOrders: true,
    canAssignWorkOrders: true,
    viewOnlyAssignedWorkOrders: false,
    accessibleTabs: ['index', 'vehicles', 'work-orders', 'clients', 'users', 'settings'],
    assignableRoles: ['mechanic'],
  },
  mechanic: {
    canManageWorkshops: false,
    canManageUsers: false,
    canManageVehicles: false,
    canManageClients: false,
    canManageWorkOrders: true,
    canAssignWorkOrders: false,
    viewOnlyAssignedWorkOrders: true,
    accessibleTabs: ['index', 'work-orders', 'settings'],
    assignableRoles: [],
  },
};

const getPermissions = (role?: UserRole): RolePermissions => {
  if (!role) {
    return ROLE_PERMISSIONS.mechanic;
  }
  return ROLE_PERMISSIONS[role];
};

const getAuthParamsFromUrl = (url: string) => {
  const params: Record<string, string> = {};
  const parts = url.split(/[?#]/).slice(1);

  parts.forEach((part) => {
    part.split('&').forEach((pair) => {
      const [rawKey, rawValue] = pair.split('=');
      if (!rawKey) return;
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue ?? '');
    });
  });

  return params;
};

const getOAuthRedirectUrl = () => {
  if (Platform.OS !== 'web') {
    if (explicitAuthRedirectUrl) {
      return explicitAuthRedirectUrl;
    }

    return Linking.createURL('login');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/login`;
  }

  return Linking.createURL('login');
};

const clearWebOAuthCallbackUrl = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  const cleanUrl = `${window.location.origin}/login`;
  window.history.replaceState(window.history.state, '', cleanUrl);
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

  const clearInternalSession = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const setInternalUser = async (dbUser: DbUser) => {
    const appUser = mapDbUserToUser(dbUser);
    setUser(appUser);
    setAuthError(null);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));
    return appUser;
  };

  const findInternalUserByEmail = async (email: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) throw error;
    return data;
  };

  const findInternalUserByAuthId = async (authUserId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) throw error;
    return data;
  };

  const loadUserFromSupabaseAuth = async (authUserId: string, authEmail?: string | null) => {
    try {
      setAuthError(null);
      const email = authEmail?.trim().toLowerCase();
      let dbUser = email ? await findInternalUserByEmail(email) : null;
      const userLinkedToAuthId = await findInternalUserByAuthId(authUserId);

      if (!dbUser) {
        dbUser = userLinkedToAuthId;
      }

      if (dbUser && email && dbUser.email.toLowerCase() !== email) {
        await supabase.auth.signOut();
        await clearInternalSession();
        setAuthError('Tu cuenta de Google no coincide con el correo autorizado en Gesticar.');
        return null;
      }

      if (dbUser && userLinkedToAuthId && userLinkedToAuthId.id !== dbUser.id) {
        const { error: unlinkError } = await supabase
          .from('users')
          .update({ auth_user_id: null })
          .eq('id', userLinkedToAuthId.id);

        if (unlinkError) throw unlinkError;
      }

      if (!dbUser) {
        await supabase.auth.signOut();
        await clearInternalSession();
        setAuthError('Tu cuenta de Google no esta autorizada en Gesticar. Pide al administrador que te invite.');
        return null;
      }

      if (dbUser.status === 'disabled') {
        await supabase.auth.signOut();
        await clearInternalSession();
        setAuthError('Tu usuario esta desactivado. Contacta al administrador.');
        return null;
      }

      const updates: Database['public']['Tables']['users']['Update'] = {
        auth_user_id: authUserId,
        status: 'active',
        last_login_at: new Date().toISOString(),
      };

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', dbUser.id)
        .select()
        .single();

      if (error) throw error;
      return await setInternalUser(updatedUser);
    } catch (error) {
      console.error('[AuthContext] Error loading Google user:', error);
      await clearInternalSession();
      setAuthError('No se pudo validar tu acceso. Intenta nuevamente.');
      return null;
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error && data.status !== 'disabled') {
        return await setInternalUser(data);
      }

      await clearInternalSession();
      return null;
    } catch (error) {
      console.error('[AuthContext] Error loading stored user:', error);
      await clearInternalSession();
      return null;
    }
  };

  const createSessionFromUrl = async (url: string) => {
    const params = getAuthParamsFromUrl(url);

    if (params.error || params.error_code) {
      throw new Error(params.error_description || params.error || params.error_code);
    }

    if (params.access_token && params.refresh_token) {
      const { data, error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });

      if (error) throw error;
      return data.session;
    }

    if (params.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) throw error;
      return data.session;
    }

    return null;
  };

  const isOAuthCallbackUrl = (url?: string | null) => {
    if (!url) return false;
    return url.includes('code=') || url.includes('access_token=') || url.includes('error=');
  };

  const handleOAuthCallbackUrl = async (url?: string | null) => {
    if (!isOAuthCallbackUrl(url)) return false;

    try {
      const session = await createSessionFromUrl(url as string);
      if (!session?.user) return false;

      await loadUserFromSupabaseAuth(session.user.id, session.user.email);
      return true;
    } finally {
      clearWebOAuthCallbackUrl();
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const callbackUrl =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : await Linking.getInitialURL();

        const handledCallback = await handleOAuthCallbackUrl(callbackUrl);
        if (handledCallback) return;

        const { data } = await supabase.auth.getSession();

        if (data.session?.user) {
          await loadUserFromSupabaseAuth(data.session.user.id, data.session.user.email);
          return;
        }

        const storedUser = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          await loadUserData(parsedUser.id);
        }
      } catch (error) {
        console.error('[AuthContext] Error restoring session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();

    const linkingSubscription = Linking.addEventListener('url', async ({ url }) => {
      try {
        setIsLoading(true);
        await handleOAuthCallbackUrl(url);
      } catch (error) {
        console.error('[AuthContext] Error handling auth callback URL:', error);
        setAuthError('No se pudo completar el inicio de sesion.');
      } finally {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;

      setTimeout(() => {
        void (async () => {
          try {
            if (session?.user) {
              await loadUserFromSupabaseAuth(session.user.id, session.user.email);
            } else {
              await clearInternalSession();
            }
          } finally {
            setIsLoading(false);
          }
        })();
      }, 0);
    });

    return () => {
      linkingSubscription.remove();
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inLoginScreen = segments[0] === 'login';
    const atRoot = !segments[0];

    if (!user && !inLoginScreen) {
      router.replace('/login' as any);
    } else if (user && (inLoginScreen || atRoot)) {
      const timeout = setTimeout(() => {
        router.replace('/(tabs)' as any);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [user, segments, isLoading, router]);

  useEffect(() => {
    if (!user?.id) return;

    const refreshCurrentUser = () => {
      void loadUserData(user.id).catch((error) => {
        console.error('[AuthContext] Error refreshing current user:', error);
      });
    };

    const refreshInterval = setInterval(() => {
      refreshCurrentUser();
    }, REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(refreshInterval);
    };
  }, [user?.id]);

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const redirectTo = getOAuthRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No se pudo iniciar Google OAuth.');

      if (Platform.OS === 'web') {
        window.location.assign(data.url);
        return { success: true };
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          await loadUserFromSupabaseAuth(sessionData.session.user.id, sessionData.session.user.email);
          return { success: true };
        }

        return { success: false, error: 'Inicio de sesion cancelado.' };
      }

      const session = await createSessionFromUrl(result.url);
      const authUser = session?.user;

      if (!authUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
          throw new Error('Google no devolvio una sesion valida.');
        }
        await loadUserFromSupabaseAuth(sessionData.session.user.id, sessionData.session.user.email);
      } else {
        await loadUserFromSupabaseAuth(authUser.id, authUser.email);
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthContext] Google login error:', error);
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesion con Google.';
      setAuthError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (): Promise<{ success: boolean; error?: string }> => ({
    success: false,
    error: 'El acceso con contrasena fue reemplazado por Google.',
  });

  const logout = async () => {
    await supabase.auth.signOut();
    await clearInternalSession();
    router.replace('/login' as any);
  };

  const refreshUser = async () => {
    if (!user) return undefined;
    return await loadUserData(user.id) ?? undefined;
  };

  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';
  const isMechanic = user?.role === 'mechanic';
  const permissions = getPermissions(user?.role);

  return {
    user,
    isLoading,
    authError,
    login,
    loginWithGoogle,
    logout,
    isAdmin,
    isTechnician,
    isMechanic,
    permissions,
    refreshUser,
  };
});

export type { RolePermissions, AppTabName };
