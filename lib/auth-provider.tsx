'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/supabase-browser';
import type { Profile } from '@/lib/types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    const currentUser = currentSession?.user;
    if (!currentUser) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();
    if (error) {
      console.error('refreshProfile error:', error.message);
    }
    setProfile(data as Profile | null);
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', existingSession.user.id)
          .maybeSingle();
        if (mounted) setProfile(data as Profile | null);
      }
      if (mounted) setLoading(false);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        (async () => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newSession.user.id)
              .maybeSingle();
            setProfile(data as Profile | null);
          } else {
            setProfile(null);
          }
          setLoading(false);
        })();
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
