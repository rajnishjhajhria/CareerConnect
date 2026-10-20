// CareerConnect — global auth state (STEP 5; storage-hardened STEP 12)
// Holds { user, token } and exposes login/register/logout to every component
// via the useAuth() hook. Token persistence lives in services/api.js.
import { createContext, useContext, useState, useEffect } from 'react';
import api, {
  getStoredToken,
  getStoredUser,
  storeSession,
  clearSession,
  isRememberedSession,
} from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Pre-fill from storage so the UI renders instantly on refresh…
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStoredToken());
  // …then verify the token is still valid (loading = "checking session")
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapSession = async () => {
      if (!getStoredToken()) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me'); // api.js attaches the token
        setUser(res.data.data.user);
        // Re-store the fresh user in whichever storage holds this session
        storeSession(
          res.data.data.user,
          getStoredToken(),
          isRememberedSession()
        );
      } catch {
        // Token invalid/expired → clear the stale session silently
        setUser(null);
        setToken(null);
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    bootstrapSession();
  }, []);

  const saveSession = (userData, jwt, remember = true) => {
    setUser(userData);
    setToken(jwt);
    storeSession(userData, jwt, remember);
  };

  const login = async (email, password, remember = true) => {
    const res = await api.post('/auth/login', { email, password });
    saveSession(res.data.data.user, res.data.data.token, remember);
    return res.data.data.user; // returned so forms can redirect by role
  };

  const register = async (payload, remember = true) => {
    const res = await api.post('/auth/register', payload);
    saveSession(res.data.data.user, res.data.data.token, remember);
    return res.data.data.user;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    clearSession();
  };

  // Re-fetch the user (used after profile updates so the UI stays fresh)
  const refreshUser = async () => {
    const res = await api.get('/auth/me');
    const freshUser = res.data.data.user;
    setUser(freshUser);
    storeSession(freshUser, getStoredToken(), isRememberedSession());
    return freshUser;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    isJobSeeker: user?.role === 'jobseeker',
    isRecruiter: user?.role === 'recruiter',
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
