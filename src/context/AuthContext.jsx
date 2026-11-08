import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

const DEMO_MANAGER_USER = {
  id: '00000000-0000-0000-0000-000000000099',
  email: 'manager@datastraw.io',
  user_metadata: {
    full_name: 'Operations Manager',
  },
};

const DEMO_MANAGER_PROFILE = {
  user_id: '00000000-0000-0000-0000-000000000099',
  role: 'manager',
  created_at: new Date().toISOString(),
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Check local session flag first (e.g. demo manager session)
    const storedDemo = localStorage.getItem('datastraw_auth_demo_session');
    if (storedDemo) {
      setUser(DEMO_MANAGER_USER);
      setProfile(DEMO_MANAGER_PROFILE);
      setIsLoading(false);
      return;
    }

    // 2. Check Supabase auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
      } else {
        // Fallback default manager profile
        setProfile({ user_id: userId, role: 'manager' });
      }
    } catch (e) {
      setProfile({ user_id: userId, role: 'manager' });
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email, password) {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      throw error;
    }

    setUser(data.user);
    setSession(data.session);
    await fetchProfile(data.user.id);
    return data;
  }

  async function signInDemoManager() {
    setIsLoading(true);
    localStorage.setItem('datastraw_auth_demo_session', 'true');
    setUser(DEMO_MANAGER_USER);
    setProfile(DEMO_MANAGER_PROFILE);
    setIsLoading(false);
  }

  async function signOut() {
    setIsLoading(true);
    localStorage.removeItem('datastraw_auth_demo_session');
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsLoading(false);
  }

  const isManager = profile?.role === 'manager' || user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isManager,
        isLoading,
        signIn,
        signInDemoManager,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
