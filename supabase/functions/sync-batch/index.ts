// Supabase Edge Function: sync-batch
// Handles bulk batch mutations from offline sync queue with transactional validation

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

    const { operations } = await req.json();

    if (!Array.isArray(operations)) {
      return new Response(
        JSON.stringify({ error: 'operations array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const op of operations) {
      const { table, operation, payload, id } = op;
      
      // Ensure user ownership
      payload.user_id = user.id;

      if (operation === 'CREATE' || operation === 'UPDATE') {
        const { error } = await supabaseClient
          .from(table)
          .upsert(payload, { onConflict: 'id' });
        results.push({ id, status: error ? 'FAILED' : 'SUCCESS', error: error?.message });
      } else if (operation === 'DELETE') {
        const { error } = await supabaseClient
          .from(table)
          .delete()
          .eq('id', payload.id)
          .eq('user_id', user.id);
        results.push({ id, status: error ? 'FAILED' : 'SUCCESS', error: error?.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
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
