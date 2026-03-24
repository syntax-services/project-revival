import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isEmailVerified: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [resolvedUserType, setResolvedUserType] = useState<ResolvedUserType | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);
  const authHydratedRef = useRef(false);

  const normalizeAccountType = (userType: Profile['user_type'] | null | undefined): AccountType | null => {
    if (userType === 'business' || userType === 'customer') {
      return userType;
    }

    return null;
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

    return nextResolvedUserType === 'business' ? '/business' : '/customer';
  };

  const applyResolvedState = ({
    profile: nextProfile,
    accountType: nextAccountType,
    resolvedUserType: nextResolvedUserType,
    isAdmin: nextIsAdmin,
  }: {
    profile: Profile | null;
    accountType: AccountType | null;
    resolvedUserType: ResolvedUserType | null;
    isAdmin: boolean;
  }) => {
    setProfile(nextProfile);
    setAccountType(nextAccountType);
    setResolvedUserType(nextResolvedUserType);
    setIsAdmin(nextIsAdmin);
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
    const nextIsAdmin = !!adminRoleResult.data;
    const inferredAccountType =
      businessResult.data ? 'business' : customerResult.data ? 'customer' : normalizeAccountType(rawProfile?.user_type);
    const normalizedProfileType =
      inferredAccountType ?? (nextIsAdmin ? 'admin' : normalizeAccountType(rawProfile?.user_type) ?? null);

    const nextProfile =
      rawProfile && normalizedProfileType && rawProfile.user_type !== normalizedProfileType
        ? { ...rawProfile, user_type: normalizedProfileType }
        : rawProfile;

    if (
      rawProfile &&
      inferredAccountType &&
      !nextIsAdmin &&
      rawProfile.user_type !== inferredAccountType
    ) {
      const { error: repairError } = await supabase
        .from('profiles')
        .update({ user_type: inferredAccountType })
        .eq('user_id', userId);

      if (repairError) {
        console.warn('Failed to repair profile user_type:', repairError);
      }
    }

    return {
      profile: nextProfile,
      accountType: inferredAccountType,
      resolvedUserType: nextIsAdmin
        ? 'admin'
        : inferredAccountType ?? normalizeAccountType(nextProfile?.user_type),
      isAdmin: nextIsAdmin,
    };
  };

  const refreshProfile = async () => {
    if (!user) {
      return;
    }

    const nextState = await fetchResolvedAuthState(user.id);
    applyResolvedState(nextState);
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
        }
        authHydratedRef.current = true;
        return;
      }

      if (options.skipProfileRefresh) {
        if (isMounted && options.blockUI) {
          setLoading(false);
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

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
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
    await supabase.auth.signOut();
    applyResolvedState({
      profile: null,
      accountType: null,
      resolvedUserType: null,
      isAdmin: false,
    });
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
