import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});
const ADMIN_EMAIL = 'gowdaroshan49@gmail.com';
const AUTH_BLOCK_KEY = 'krishimitra_auth_block';

const setBlockedLoginState = (payload) => {
  localStorage.setItem(AUTH_BLOCK_KEY, JSON.stringify(payload));
};

const clearBlockedLoginState = () => {
  localStorage.removeItem(AUTH_BLOCK_KEY);
};

const isMissingColumnError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('schema cache') || message.includes('could not find');
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applySession = async (session) => {
      const nextUser = session?.user ?? null;
      if (!nextUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const userEmail = String(nextUser.email || '').toLowerCase();
      const isAdminEmail = userEmail === ADMIN_EMAIL;

      let dbUser = null;
      const primaryQuery = await supabase
        .from('users')
        .select('id, role, account_status, suspension_until, suspension_reason')
        .eq('id', nextUser.id)
        .maybeSingle();

      if (primaryQuery.error && isMissingColumnError(primaryQuery.error)) {
        const fallbackQuery = await supabase
          .from('users')
          .select('id, role, account_status')
          .eq('id', nextUser.id)
          .maybeSingle();
        dbUser = fallbackQuery.data || null;
      } else {
        dbUser = primaryQuery.data || null;
      }

      const accountStatus = String(dbUser?.account_status || 'active').toLowerCase();
      const suspensionReason = dbUser?.suspension_reason || 'Policy violation.';
      const suspensionUntil = dbUser?.suspension_until ? new Date(dbUser.suspension_until) : null;
      const isTempSuspended = ['suspended', 'suspended_temporary'].includes(accountStatus)
        && suspensionUntil
        && suspensionUntil.getTime() > Date.now();
      const isPermanentSuspended = ['blocked', 'banned', 'suspended_permanent'].includes(accountStatus);

      if (isTempSuspended || isPermanentSuspended) {
        setBlockedLoginState({
          type: isTempSuspended ? 'temporary' : 'permanent',
          reason: suspensionReason,
          until: suspensionUntil?.toISOString() || null,
        });
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        return;
      }

      if (['suspended', 'suspended_temporary'].includes(accountStatus) && suspensionUntil && suspensionUntil.getTime() <= Date.now()) {
        await supabase
          .from('users')
          .update({
            account_status: 'active',
            suspension_until: null,
            suspension_reason: null,
          })
          .eq('id', nextUser.id);
      }

      clearBlockedLoginState();

      if (isAdminEmail) {
        localStorage.setItem('krishimitra_role', 'admin');
      } else if (dbUser?.role) {
        localStorage.setItem('krishimitra_role', dbUser.role);
      }

      setUser(nextUser);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const callbackUrl = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearBlockedLoginState();
    setUser(null);
  };

  const completeProfile = () => {
    localStorage.setItem('krishimitra_profile_complete', 'true');
  };

  const value = useMemo(() => ({
    user,
    loading,
    signInWithGoogle,
    signOut,
    completeProfile,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
