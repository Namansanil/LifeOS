import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '@/types';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { db } from '@/services/database';

export interface AuthResponse {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
}

interface AuthContextValue {
  user: UserProfile | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  login: (email: string, pass: string) => Promise<AuthResponse>;
  signup: (email: string, pass: string, firstName: string, lastName?: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<AuthResponse>;
  updatePassword: (newPassword: string) => Promise<AuthResponse>;
  resendVerificationEmail: (email: string) => Promise<AuthResponse>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateEnabledPillars: (pillars: UserProfile['enabled_pillars']) => Promise<void>;
  updatePreferences: (prefs: Partial<UserProfile['preferences']>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_PILLARS = {
  move: true,
  surf: true,
  learn: true,
  build: true,
  live: true,
};

const DEFAULT_PREFERENCES: UserProfile['preferences'] = {
  theme: 'system',
  distance_unit: 'km',
  weight_unit: 'kg',
  notifications_enabled: true,
  gps_auto_pause: true,
  location_privacy: 'PRIVATE',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
  };

  const loadUserProfile = useCallback(async (userId: string, email: string, userMeta?: any): Promise<UserProfile> => {
    try {
      if (isSupabaseConfigured) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileData) {
          const { data: prefData } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

          return {
            id: profileData.id,
            email: profileData.email || email,
            full_name: profileData.full_name || userMeta?.full_name || 'Athlete',
            avatar_url: profileData.avatar_url || undefined,
            email_verified: Boolean(userMeta?.email_verified ?? true),
            created_at: profileData.created_at || new Date().toISOString(),
            updated_at: profileData.updated_at || new Date().toISOString(),
            enabled_pillars: profileData.enabled_pillars || DEFAULT_PILLARS,
            preferences: prefData ? {
              theme: prefData.theme || 'system',
              distance_unit: prefData.distance_unit || 'km',
              weight_unit: prefData.weight_unit || 'kg',
              notifications_enabled: prefData.notifications_enabled ?? true,
              gps_auto_pause: prefData.gps_auto_pause ?? true,
              location_privacy: prefData.location_privacy || 'PRIVATE',
            } : DEFAULT_PREFERENCES,
          };
        }
      }
    } catch {
      // Fallback if table not ready
    }

    const fullName = userMeta?.full_name ||
      [userMeta?.first_name, userMeta?.last_name].filter(Boolean).join(' ') ||
      email.split('@')[0];

    return {
      id: userId,
      email,
      full_name: fullName,
      email_verified: Boolean(userMeta?.email_verified ?? true),
      created_at: new Date().toISOString(),
      enabled_pillars: DEFAULT_PILLARS,
      preferences: DEFAULT_PREFERENCES,
    };
  }, []);

  const bootstrapAuth = useCallback(async () => {
    try {
      await db.init();

      if (isSupabaseConfigured) {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Session retrieval error:', error.message);
        }

        if (initialSession?.user) {
          setSession(initialSession);
          const profile = await loadUserProfile(
            initialSession.user.id,
            initialSession.user.email || '',
            initialSession.user.user_metadata
          );
          setUser(profile);
          await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(profile));
        } else {
          setUser(null);
          setSession(null);
          await AsyncStorage.removeItem('@lifeos_current_user');
        }
      } else {
        // Local offline mode
        const savedUserStr = await AsyncStorage.getItem('@lifeos_current_user');
        if (savedUserStr) {
          setUser(JSON.parse(savedUserStr));
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.warn('Auth bootstrap failed:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadUserProfile]);

  useEffect(() => {
    bootstrapAuth();

    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (event === 'SIGNED_IN' && newSession?.user) {
            setSession(newSession);
            const profile = await loadUserProfile(
              newSession.user.id,
              newSession.user.email || '',
              newSession.user.user_metadata
            );
            setUser(profile);
            await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(profile));
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
            await AsyncStorage.removeItem('@lifeos_current_user');
          } else if (event === 'TOKEN_REFRESHED' && newSession) {
            setSession(newSession);
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [bootstrapAuth, loadUserProfile]);

  const login = async (email: string, pass: string): Promise<AuthResponse> => {
    setIsLoading(true);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !pass) {
      setIsLoading(false);
      return { success: false, error: 'Email and password are required.' };
    }

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: pass,
        });

        if (error) {
          return {
            success: false,
            error: error.message.includes('Invalid login credentials')
              ? 'Invalid email or password. Please verify your credentials.'
              : error.message,
          };
        }

        if (data.user) {
          setSession(data.session);
          const profile = await loadUserProfile(
            data.user.id,
            data.user.email || normalizedEmail,
            data.user.user_metadata
          );
          setUser(profile);
          await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(profile));
          return { success: true };
        }
        return { success: false, error: 'Login failed. Please try again.' };
      } else {
        // Local developer fallback
        const profile: UserProfile = {
          id: `user_${Date.now()}`,
          email: normalizedEmail,
          full_name: normalizedEmail.split('@')[0],
          created_at: new Date().toISOString(),
          enabled_pillars: DEFAULT_PILLARS,
          preferences: DEFAULT_PREFERENCES,
        };
        setUser(profile);
        await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(profile));
        return { success: true };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'A network error occurred. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    pass: string,
    firstName: string,
    lastName: string = ''
  ): Promise<AuthResponse> => {
    setIsLoading(true);
    const normalizedEmail = normalizeEmail(email);
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName) {
      setIsLoading(false);
      return { success: false, error: 'First name is required.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setIsLoading(false);
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (pass.length < 8) {
      setIsLoading(false);
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim();

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: pass,
          options: {
            data: {
              first_name: trimmedFirstName,
              last_name: trimmedLastName,
              full_name: fullName,
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered') || error.message.includes('User already registered')) {
            return {
              success: false,
              error: 'An account with this email address already exists. Please sign in instead.',
            };
          }
          return { success: false, error: error.message };
        }

        if (data.user) {
          if (data.session) {
            setSession(data.session);
            const profile = await loadUserProfile(data.user.id, normalizedEmail, {
              first_name: trimmedFirstName,
              last_name: trimmedLastName,
              full_name: fullName,
            });
            setUser(profile);
            await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(profile));
            return { success: true, requiresVerification: false };
          } else {
            // Email verification is required
            return { success: true, requiresVerification: true };
          }
        }
        return { success: false, error: 'Registration failed. Please try again.' };
      } else {
        const profile: UserProfile = {
          id: `user_${Date.now()}`,
          email: normalizedEmail,
          full_name: fullName,
          created_at: new Date().toISOString(),
          enabled_pillars: DEFAULT_PILLARS,
          preferences: DEFAULT_PREFERENCES,
        };
        setUser(profile);
        await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(profile));
        return { success: true, requiresVerification: false };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'An error occurred during registration.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      await AsyncStorage.removeItem('@lifeos_current_user');
      setUser(null);
      setSession(null);
    } catch (err) {
      console.warn('Logout warning:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPasswordForEmail = async (email: string): Promise<AuthResponse> => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return { success: false, error: 'Please enter your email address.' };
    }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
        if (error) {
          return { success: false, error: error.message };
        }
      }
      return {
        success: true,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to send password reset request.' };
    }
  };

  const updatePassword = async (newPassword: string): Promise<AuthResponse> => {
    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          return { success: false, error: error.message };
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update password.' };
    }
  };

  const resendVerificationEmail = async (email: string): Promise<AuthResponse> => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return { success: false, error: 'Email is required.' };
    }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: normalizedEmail,
        });
        if (error) {
          return { success: false, error: error.message };
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to resend verification email.' };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated: UserProfile = { ...user, ...updates, updated_at: new Date().toISOString() };
    setUser(updated);
    await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(updated));

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('profiles')
          .update({
            full_name: updated.full_name,
            avatar_url: updated.avatar_url,
            updated_at: updated.updated_at,
          })
          .eq('id', user.id);
      } catch (err) {
        console.warn('Profile cloud sync warning:', err);
      }
    }
  };

  const updateEnabledPillars = async (pillars: UserProfile['enabled_pillars']) => {
    if (!user) return;
    const updated: UserProfile = { ...user, enabled_pillars: pillars };
    setUser(updated);
    await AsyncStorage.setItem('@lifeos_current_user', JSON.stringify(updated));
    await db.enqueueSync('profile', user.id, 'UPDATE', { enabled_pillars: pillars });

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('profiles')
          .update({ enabled_pillars: pillars, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (err) {
        console.warn('Pillars cloud sync warning:', err);
      }
    }
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

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            ...updated.preferences,
            updated_at: new Date().toISOString(),
          });
      } catch (err) {
        console.warn('Preferences cloud sync warning:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: Boolean(user && user.id),
        isEmailVerified: Boolean(user?.email_verified ?? true),
        login,
        signup,
        logout,
        resetPasswordForEmail,
        updatePassword,
        resendVerificationEmail,
        updateProfile,
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
