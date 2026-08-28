import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-lifeos.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured =
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL) &&
  process.env.EXPO_PUBLIC_SUPABASE_URL !== 'https://placeholder-lifeos.supabase.co' &&
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Helper to invoke Supabase Edge Functions
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, any> = {}
): Promise<{ data: T | null; error: any }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') };
  }
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// Helper to invoke Database RPC Functions
export async function invokeRpc<T = any>(
  rpcName: string,
  params: Record<string, any> = {}
): Promise<{ data: T | null; error: any }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase not configured') };
  }
  try {
    const { data, error } = await supabase.rpc(rpcName, params);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// Storage Helpers
export async function uploadAvatar(
  userId: string,
  filePath: string,
  fileData: ArrayBuffer | Blob
): Promise<{ data: any; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Supabase not configured') };
  const filename = `${userId}/avatar_${Date.now()}.png`;
  return await supabase.storage.from('avatars').upload(filename, fileData, {
    upsert: true,
    contentType: 'image/png',
  });
}

export function getPublicAvatarUrl(path: string): string {
  if (!isSupabaseConfigured) return '';
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data?.publicUrl || '';
}

export async function uploadRouteFile(
  userId: string,
  activityId: string,
  geoJsonContent: string
): Promise<{ data: any; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Supabase not configured') };
  const filename = `${userId}/${activityId}_route.geojson`;
  return await supabase.storage.from('activity_routes').upload(filename, geoJsonContent, {
    upsert: true,
    contentType: 'application/json',
  });
}

