import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '@/types';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { populateSeedData, SEED_PROFILE, SEED_USER_ID } from '@/services/seedData';
import { db } from '@/services/database';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loginDemoUser: () => Promise<void>;
  updateEnabledPillars: (pillars: UserProfile['enabled_pillars']) => Promise<void>;
  updatePreferences: (prefs: Partial<UserProfile['preferences']>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      await db.init();
      const savedUserStr = await AsyncStorage.getItem('@lifeos_current_user');
      if (savedUserStr) {
        setUser(JSON.parse(savedUserStr));
      } else {
        // Automatically start with demo/initial profile for instant rich experience
        await loginDemoUser();
      }
    } catch (err) {
      console.warn('Auth bootstrap failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemoUser = async () => {
    setIsLoading(true);
    try {
      await populateSeedData(SEED_USER_ID);
      setUser(SEED_PROFILE);
      await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(SEED_PROFILE));
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) throw error;
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || 'Athlete',
            created_at: data.user.created_at,
            enabled_pillars: { move: true, surf: true, learn: true, build: true, live: true },
            preferences: {
              theme: 'system',
              distance_unit: 'km',
              weight_unit: 'kg',
              notifications_enabled: true,
              gps_auto_pause: true,
              location_privacy: 'PRIVATE',
            },
          };
          setUser(profile);
          await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(profile));
        }
      } else {
        const profile: UserProfile = {
          id: `user_${Date.now()}`,
          email,
          full_name: email.split('@')[0],
          created_at: new Date().toISOString(),
          enabled_pillars: { move: true, surf: true, learn: true, build: true, live: true },
          preferences: {
            theme: 'system',
            distance_unit: 'km',
            weight_unit: 'kg',
            notifications_enabled: true,
            gps_auto_pause: true,
            location_privacy: 'PRIVATE',
          },
        };
        setUser(profile);
        await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(profile));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email,
            full_name: name,
            created_at: new Date().toISOString(),
            enabled_pillars: { move: true, surf: true, learn: true, build: true, live: true },
            preferences: {
              theme: 'system',
              distance_unit: 'km',
              weight_unit: 'kg',
              notifications_enabled: true,
              gps_auto_pause: true,
              location_privacy: 'PRIVATE',
            },
          };
          setUser(profile);
          await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(profile));
        }
      } else {
        const profile: UserProfile = {
          id: `user_${Date.now()}`,
          email,
          full_name: name,
          created_at: new Date().toISOString(),
          enabled_pillars: { move: true, surf: true, learn: true, build: true, live: true },
          preferences: {
            theme: 'system',
            distance_unit: 'km',
            weight_unit: 'kg',
            notifications_enabled: true,
            gps_auto_pause: true,
            location_privacy: 'PRIVATE',
          },
        };
        setUser(profile);
        await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(profile));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    await AsyncStorage.removeItem('@lifeos_current_user');
    setUser(null);
  };

  const updateEnabledPillars = async (pillars: UserProfile['enabled_pillars']) => {
    if (!user) return;
    const updated: UserProfile = { ...user, enabled_pillars: pillars };
    setUser(updated);
    await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(updated));
    await db.enqueueSync('profile', user.id, 'UPDATE', { enabled_pillars: pillars });
  };

  const updatePreferences = async (prefs: Partial<UserProfile['preferences']>) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      preferences: { ...user.preferences, ...prefs },
    };
    setUser(updated);
    await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(updated));
    await db.enqueueSync('user_preferences', user.id, 'UPDATE', updated.preferences);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        signup,
        logout,
        loginDemoUser,
        updateEnabledPillars,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
