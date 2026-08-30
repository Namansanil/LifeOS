import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationInput {
  latitude: number;
  longitude: number;
}

interface ElevationRequest {
  locations: LocationInput[];
}

interface OpenTopoDataResult {
  elevation: number | null;
  location: {
    lat: number;
    lng: number;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENTOPODATA_URL =
      Deno.env.get('OPENTOPODATA_URL') || 'http://localhost:5000';
    const DATASET = Deno.env.get('DEM_DATASET') || 'copernicus-glo-30';

    const body: ElevationRequest = await req.json();
    const { locations } = body;

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid or empty locations array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 100 locations per request (matching Open Topo Data limits)
    const clampedLocations = locations.slice(0, 100);
    const locString = clampedLocations
      .map((l) => `${l.latitude.toFixed(6)},${l.longitude.toFixed(6)}`)
      .join('|');

    // Query Open Topo Data
    const targetUrl = `${OPENTOPODATA_URL}/v1/${DATASET}?locations=${locString}`;
    const topoResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!topoResponse.ok) {
      const errorText = await topoResponse.text();
      return new Response(
        JSON.stringify({
          error: `Open Topo Data error: ${topoResponse.statusText}`,
          details: errorText,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const topoData = await topoResponse.json();
    const results = (topoData.results || []).map((r: OpenTopoDataResult) => ({
      latitude: r.location.lat,
      longitude: r.location.lng,
      elevation: r.elevation,
    }));

    return new Response(
      JSON.stringify({
        status: 'OK',
        dataset: DATASET,
        count: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: 'Elevation lookup failed',
        message: err?.message || String(err),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
