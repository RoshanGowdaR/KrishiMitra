import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const USER_STORAGE_KEY = 'krishimitra_user';
const PROFILE_DONE_KEY = 'krishimitra_profile_complete';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = readStoredUser();
    setUser(stored);
    setLoading(false);
  }, []);

  const setAuthUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  };

  const signIn = ({ isNewUser }) => {
    const existing = readStoredUser();
    const profileComplete = localStorage.getItem(PROFILE_DONE_KEY) === 'true';

    const nextUser = existing || {
      id: 'local-user',
      email: 'farmer@krishimitra.app',
    };

    nextUser.isNewUser = Boolean(isNewUser);
    nextUser.profileComplete = profileComplete;

    setAuthUser(nextUser);
    return nextUser;
  };

  const completeProfile = () => {
    const existing = readStoredUser() || { id: 'local-user', email: 'farmer@krishimitra.app' };
    existing.profileComplete = true;
    existing.isNewUser = false;
    localStorage.setItem(PROFILE_DONE_KEY, 'true');
    setAuthUser(existing);
  };

  const signOut = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signOut,
    completeProfile,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
