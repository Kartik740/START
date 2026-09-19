import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { sessionStorageManager } from '../features/sessions/sessionStorage.ts';
import { storage } from '../lib/storage.ts';
import { dataService } from '../services/dataService.ts';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, pass: string, displayName?: string) => Promise<{ error: AuthError | null; user: User | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    // Check active session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        await dataService.syncWithRemote();
      }
      setIsLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (event === 'SIGNED_IN' && session?.user) {
        await dataService.syncWithRemote();
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase is not configured') as unknown as AuthError };
    }
    const { error, data } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });
    if (!error && data.user) {
      storage.clearAllData();
      setUser(data.user);
      setSession(data.session);
      await dataService.syncWithRemote();
    }
    return { error };
  };

  const signUp = async (email: string, pass: string, displayName?: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase is not configured') as unknown as AuthError, user: null };
    }

    const trimmedEmail = email.trim();

    // 1. Primary path: Use backend admin endpoint to auto-confirm and bypass Supabase email limits
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password: pass,
          displayName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          error: new Error(result.error || 'Account creation failed.') as unknown as AuthError,
          user: null,
        };
      }

      // User created with email_confirm: true on server. Now sign in directly:
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: pass,
      });

      if (signInError) {
        return { error: signInError, user: null };
      }

      if (signInData.user) {
        storage.clearAllData();
        setUser(signInData.user);
        setSession(signInData.session);
        await dataService.syncWithRemote();
        return { error: null, user: signInData.user };
      }
    } catch {
      // Backend not running / offline: proceed to client-side fallback
    }

    // 2. Fallback to direct client-side Supabase signup
    const { error, data } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: pass,
      options: {
        data: {
          display_name: displayName?.trim() || trimmedEmail.split('@')[0],
        },
      },
    });

    if (!error && data.user) {
      storage.clearAllData();
      setUser(data.user);
      setSession(data.session);

      // Initialize profile row in public.profiles
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          display_name: displayName?.trim() || trimmedEmail.split('@')[0],
          theme: 'dark',
          sound_enabled: true,
          is_onboarding_completed: false,
        });
      } catch (err) {
        console.warn('Could not initialize public profile:', err);
      }

      await dataService.syncWithRemote();
    }

    return { error, user: data.user };
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);

    // Clear session state and local storage cache so next user starts clean
    sessionStorageManager.clearActiveSession();
    storage.clearAllData();
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase is not configured') as unknown as AuthError };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login?type=recovery`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
