// Supabase Edge Function: weekly-digest
// Aggregates 7-day multi-pillar performance (Move, Surf, Learn, Build, Live)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // 1. Activities
    const { data: activities } = await supabaseClient
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .gte('started_at', sevenDaysAgo);

    // 2. Workouts
    const { data: workouts } = await supabaseClient
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .gte('started_at', sevenDaysAgo);

    // 3. Surf Sessions
    const { data: surfSessions } = await supabaseClient
      .from('surf_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('started_at', sevenDaysAgo);

    // 4. Study Sessions
    const { data: studySessions } = await supabaseClient
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('started_at', sevenDaysAgo);

    const totalDistanceMeters = (activities || []).reduce((acc, a) => acc + (a.distance || 0), 0);
    const totalActiveSeconds = (activities || []).reduce((acc, a) => acc + (a.duration || 0), 0);
    const totalWorkoutVolume = (workouts || []).reduce((acc, w) => acc + (w.volume || 0), 0);
    const totalSurfMinutes = (surfSessions || []).reduce((acc, s) => acc + Math.round((s.duration || 0) / 60), 0);
    const totalStudyMinutes = (studySessions || []).reduce((acc, st) => acc + Math.round((st.duration || 0) / 60), 0);

    const digest = {
      period: '7_DAYS',
      start_date: sevenDaysAgo,
      end_date: new Date().toISOString(),
      metrics: {
        total_distance_km: +(totalDistanceMeters / 1000).toFixed(2),
        total_active_hours: +(totalActiveSeconds / 3600).toFixed(1),
        total_workout_volume_kg: totalWorkoutVolume,
        total_surf_hours: +(totalSurfMinutes / 60).toFixed(1),
        total_study_hours: +(totalStudyMinutes / 60).toFixed(1),
        total_activities_count: (activities || []).length,
        total_workouts_count: (workouts || []).length,
        total_surf_sessions_count: (surfSessions || []).length,
      },
    };

    return new Response(JSON.stringify({ success: true, digest }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
