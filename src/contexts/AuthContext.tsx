import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { applyPalette } from '@/lib/theme';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type AccountType = 'customer' | 'business';
type ResolvedUserType = AccountType | 'admin';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  user_type: 'customer' | 'business' | 'admin';
  avatar_url: string | null;
  onboarding_completed: boolean;
  accepted_terms_version: number | null;
  terms_accepted_at: string | null;
  theme_mode?: 'dark' | 'light';
  theme_palette?: 'blue' | 'mono' | 'rose' | 'emerald' | 'sunset' | 'amber' | 'custom';
  coupon_balance: number;
  referral_code_used: string | null;
  banned?: boolean;
  idic_department?: string | null;
  idic_code?: string | null;
  is_runner?: boolean;
  runner_active?: boolean;
  runner_balance?: number;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  accountType: AccountType | null;
  resolvedUserType: ResolvedUserType | null;
  dashboardPath: string;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: { full_name?: string; account_type?: string; referral_code?: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isEmailVerified: boolean;
  hasBothRoles: boolean;
  switchRole: (role: 'customer' | 'business') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [resolvedUserType, setResolvedUserType] = useState<ResolvedUserType | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasBothRoles, setHasBothRoles] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);
  const authHydratedRef = useRef(false);

  const normalizeAccountType = (userType: Profile['user_type'] | null | undefined): AccountType | null => {
    if (userType === 'business' || userType === 'customer') {
      return userType;
    }

    return null;
  };

  const getUserAdminModeKey = (userId: string) => `string_active_admin_mode_${userId}`;
  const getUserRoleViewKey = (userId: string) => `string_active_role_view_${userId}`;

  const getActiveAdminMode = (userId: string) =>
    localStorage.getItem(getUserAdminModeKey(userId)) === 'true';

  const getActiveRoleView = (userId: string) =>
    localStorage.getItem(getUserRoleViewKey(userId));

  const setActiveAdminMode = (userId: string, value: boolean) =>
    localStorage.setItem(getUserAdminModeKey(userId), value ? 'true' : 'false');

  const setActiveRoleView = (userId: string, role: 'customer' | 'business') =>
    localStorage.setItem(getUserRoleViewKey(userId), role);

  const clearUserLocalRoleState = (userId: string | null) => {
    if (!userId) return;
    localStorage.removeItem(getUserAdminModeKey(userId));
    localStorage.removeItem(getUserRoleViewKey(userId));
  };

  const getDashboardPath = (
    nextUser: User | null,
    nextProfile: Profile | null,
    nextResolvedUserType: ResolvedUserType | null,
  ) => {
    if (!nextUser) {
      return '/auth';
    }

    if (!nextProfile?.onboarding_completed && nextResolvedUserType !== 'admin') {
      return '/onboarding';
    }

    if (nextResolvedUserType === 'admin') {
      return '/admin';
    }

    // Runner role removed for MVP

    return nextResolvedUserType === 'business' ? '/business' : '/customer';
  };

  const applyResolvedState = ({
    profile: nextProfile,
    accountType: nextAccountType,
    resolvedUserType: nextResolvedUserType,
    isAdmin: nextIsAdmin,
    hasBothRoles: nextHasBoth,
  }: {
    profile: Profile | null;
    accountType: AccountType | null;
    resolvedUserType: ResolvedUserType | null;
    isAdmin: boolean;
    hasBothRoles: boolean;
  }) => {
    setProfile(nextProfile);
    setAccountType(nextAccountType);
    setResolvedUserType(nextResolvedUserType);
    setIsAdmin(nextIsAdmin);
    setHasBothRoles(nextHasBoth);
  };

  const fetchResolvedAuthState = async (userId: string) => {
    const [profileResult, adminRoleResult, businessResult, customerResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle(),
      supabase
        .from('businesses')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (profileResult.error) {
      console.error('Error fetching profile:', profileResult.error);
    }

    if (adminRoleResult.error) {
      console.error('Error fetching admin role:', adminRoleResult.error);
    }

    if (businessResult.error) {
      console.error('Error fetching business membership:', businessResult.error);
    }

    if (customerResult.error) {
      console.error('Error fetching customer membership:', customerResult.error);
    }

    const rawProfile = profileResult.data as Profile | null;
    const nextIsAdmin = !!adminRoleResult.data || rawProfile?.user_type === 'admin';
    
    // Auto-initialize active admin mode state for administrators
    if (nextIsAdmin && userId && localStorage.getItem(getUserAdminModeKey(userId)) === null) {
      setActiveAdminMode(userId, false);
    }
    const activeAdminMode = getActiveAdminMode(userId);

    const hasBusiness = !!businessResult.data;
    const hasCustomer = !!customerResult.data;
    const hasBoth = hasBusiness && hasCustomer;

    const activeRoleView = getActiveRoleView(userId);
    let chosenAccountType: AccountType = 'customer';
    
    if (activeRoleView === 'customer' || activeRoleView === 'business') {
      chosenAccountType = activeRoleView as AccountType;
    } else if (hasBusiness) {
      chosenAccountType = 'business';
    } else {
      chosenAccountType = normalizeAccountType(rawProfile?.user_type) ?? 'customer';
    }

    // Generate Squad subaccount on the fly if missing
    if (rawProfile && !rawProfile.squad_subaccount_id && userId) {
      supabase.functions.invoke("squad-subaccount", {
        body: { userId }
      }).then(({ data }) => {
        if (data?.subaccountId) {
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }
      }).catch(err => console.warn("Failed to generate subaccount on the fly:", err));
    }

    const normalizedProfileType =
      chosenAccountType ?? (nextIsAdmin ? 'admin' : normalizeAccountType(rawProfile?.user_type) ?? null);

    const nextProfile =
      rawProfile && normalizedProfileType && rawProfile.user_type !== normalizedProfileType
        ? { ...rawProfile, user_type: normalizedProfileType }
        : rawProfile;

    const hasFetchError = !!profileResult.error || !!adminRoleResult.error || !!businessResult.error || !!customerResult.error;

    if (
      !hasFetchError &&
      rawProfile &&
      chosenAccountType &&
      !nextIsAdmin &&
      !hasBoth &&
      rawProfile.user_type !== 'admin' &&
      rawProfile.user_type !== chosenAccountType
    ) {
      const { error: repairError } = await supabase
        .from('profiles')
        .update({ user_type: chosenAccountType })
        .eq('user_id', userId);

      if (repairError) {
        console.warn('Failed to repair profile user_type:', repairError);
      }
    }

    return {
      profile: nextProfile,
      accountType: chosenAccountType,
      resolvedUserType: nextIsAdmin && activeAdminMode
        ? 'admin'
        : chosenAccountType,
      isAdmin: nextIsAdmin,
      hasBothRoles: hasBoth,
    };
  };

  const refreshProfile = async () => {
    if (!user) {
      return;
    }

    const nextState = await fetchResolvedAuthState(user.id);
    applyResolvedState(nextState);
    queryClient.invalidateQueries({ queryKey: ["business"] });
  };

  useEffect(() => {
    let isMounted = true;

    const syncAuthState = async (
      nextSession: Session | null,
      options: { blockUI: boolean; skipProfileRefresh?: boolean },
    ) => {
      if (!isMounted) {
        return;
      }

      if (options.blockUI) {
        setLoading(true);
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      currentUserIdRef.current = nextSession?.user?.id ?? null;

      if (!nextSession?.user) {
        applyResolvedState({
          profile: null,
          accountType: null,
          resolvedUserType: null,
          isAdmin: false,
        });
        if (isMounted) {
          setLoading(false);
      // Silently clean up expired premium subscriptions on auth resolve
      supabase.rpc('expire_premium_subscriptions').then(() => {}).catch(() => {});
        }
        authHydratedRef.current = true;
        return;
      }

      if (options.skipProfileRefresh) {
        if (isMounted && options.blockUI) {
          setLoading(false);
      // Silently clean up expired premium subscriptions on auth resolve
      supabase.rpc('expire_premium_subscriptions').then(() => {}).catch(() => {});
        }
        authHydratedRef.current = true;
        return;
      }

      const nextState = await fetchResolvedAuthState(nextSession.user.id);

      if (!isMounted) {
        return;
      }

      applyResolvedState(nextState);
      if (options.blockUI) {
        setLoading(false);
      // Silently clean up expired premium subscriptions on auth resolve
      supabase.rpc('expire_premium_subscriptions').then(() => {}).catch(() => {});
      }
      authHydratedRef.current = true;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }

      const nextUserId = nextSession?.user?.id ?? null;
      const sameUser = currentUserIdRef.current === nextUserId;
      const blockUI =
        !authHydratedRef.current ||
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        !sameUser;

      const skipProfileRefresh = event === 'TOKEN_REFRESHED' && sameUser;

      void syncAuthState(nextSession, {
        blockUI,
        skipProfileRefresh,
      });
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      void syncAuthState(session, { blockUI: true });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Spotify-style theme, profile and ban realtime sync
  useEffect(() => {
    if (!user?.id) return;

    // Check if initial loaded profile is already banned
    if (profile?.banned) {
      void signOut();
      window.location.href = "/banned";
      return;
    }

    // Apply loaded themes/palettes from profile
    if (profile) {
      if (profile.theme_mode) {
        const isDark = profile.theme_mode === "dark";
        localStorage.setItem("theme", profile.theme_mode);
        document.documentElement.classList.toggle("dark", isDark);
      }
      if (profile.theme_palette) {
        localStorage.setItem("palette", profile.theme_palette);
        applyPalette(profile.theme_palette);
      }
    }

    const channel = supabase
      .channel(`profile-realtime-${user.id}-${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newProfile = payload.new as Profile;
          
          if (newProfile.banned) {
            void signOut();
            window.location.href = "/banned";
            return;
          }

          setProfile(newProfile);

          if (newProfile.theme_mode) {
            const isDark = newProfile.theme_mode === "dark";
            localStorage.setItem("theme", newProfile.theme_mode);
            document.documentElement.classList.toggle("dark", isDark);
          }
          if (newProfile.theme_palette) {
            localStorage.setItem("palette", newProfile.theme_palette);
            applyPalette(newProfile.theme_palette);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.banned]);

  const signUp = async (email: string, password: string, metadata?: { full_name?: string; account_type?: string; referral_code?: string }) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: metadata?.full_name || '',
          account_type: metadata?.account_type || 'customer',
          referral_code: metadata?.referral_code || '',
        },
      },
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    const userId = user?.id ?? currentUserIdRef.current;
    clearUserLocalRoleState(userId);
    await supabase.auth.signOut();
    applyResolvedState({
      profile: null,
      accountType: null,
      resolvedUserType: null,
      isAdmin: false,
      hasBothRoles: false,
    });
  };

  const switchRole = async (targetRole: 'customer' | 'business') => {
    if (user?.id) {
      setActiveRoleView(user.id, targetRole);
    }
    
    // Optimistic UI updates
    setAccountType(targetRole);
    setResolvedUserType(targetRole);
    if (profile) {
      setProfile({ ...profile, user_type: targetRole });
    }

    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ user_type: targetRole })
          .eq('user_id', user.id);
        if (error) throw error;
      } catch (err: any) {
        console.error("Failed to update profile user_type in database:", err);
        toast.error(`Database sync issue: ${err.message || err.toString()}`);
      }
    }
    await refreshProfile();
  };

  const dashboardPath = getDashboardPath(user, profile, resolvedUserType);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        accountType,
        resolvedUserType,
        dashboardPath,
        isAdmin,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        isEmailVerified: !!user?.email_confirmed_at,
        hasBothRoles,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
