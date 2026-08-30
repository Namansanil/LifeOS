import { haversineDistance, isValidCoordinate } from './calculations';
import { supabase } from './supabase';
import { RoutePoint, RawGPSPoint } from '../types';

export interface ElevationCorrectionResult {
  success: boolean;
  source: 'DEM' | 'GPS_RAW';
  correctedAltitudes: number[];
  queryPointsCount: number;
  cacheHitsCount: number;
  error?: string;
}

export type ElevationFetcher = (
  locations: Array<{ latitude: number; longitude: number }>
) => Promise<Array<{ latitude: number; longitude: number; elevation: number | null }>>;

/**
 * Generates an 11-meter spatial cache grid key (~4 decimal places).
 */
export function getCoordinateCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

/**
 * Downsamples a route by spatial arc-length stride (~25m matching DEM native resolution).
 * Returns the indices of the selected sample points.
 */
export function downsampleRouteIndices(
  points: Array<{ latitude: number; longitude: number }>,
  targetStrideMeters: number = 25
): number[] {
  if (!points || points.length === 0) return [];
  if (points.length <= 2) return points.map((_, i) => i);

  const sampleIndices: number[] = [0];
  let accumulatedDist = 0;
  let lastSampleIndex = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const stepDist = haversineDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
    accumulatedDist += stepDist;

    if (accumulatedDist >= targetStrideMeters) {
      sampleIndices.push(i);
      lastSampleIndex = i;
      accumulatedDist = 0;
    }
  }

  // Ensure the terminal point is always anchored
  const lastIndex = points.length - 1;
  if (lastSampleIndex !== lastIndex) {
    sampleIndices.push(lastIndex);
  }

  return sampleIndices;
}

/**
 * Linearly interpolates elevation values across all intermediate route points
 * based on cumulative geodesic distance between sample anchors.
 */
export function interpolateRouteAltitudes(
  points: Array<{ latitude: number; longitude: number; altitude?: number | null }>,
  sampleIndices: number[],
  sampleElevations: Map<number, number>
): number[] {
  if (!points || points.length === 0) return [];
  if (sampleIndices.length === 0) {
    return points.map((p) => p.altitude || 0);
  }

  const result: number[] = new Array(points.length);

  // Compute cumulative geodesic distance at each point
  const cumDistances: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const d = haversineDistance(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude
    );
    cumDistances.push(cumDistances[i - 1] + d);
  }

  // Interpolate between consecutive sample indices
  for (let s = 0; s < sampleIndices.length - 1; s++) {
    const idxA = sampleIndices[s];
    const idxB = sampleIndices[s + 1];

    const elevA = sampleElevations.get(idxA) ?? points[idxA].altitude ?? 0;
    const elevB = sampleElevations.get(idxB) ?? points[idxB].altitude ?? 0;

    const distA = cumDistances[idxA];
    const distB = cumDistances[idxB];
    const segmentDist = distB - distA;

    result[idxA] = +elevA.toFixed(2);

    for (let i = idxA + 1; i <= idxB; i++) {
      if (segmentDist <= 0.1) {
        result[i] = +elevB.toFixed(2);
      } else {
        const fraction = (cumDistances[i] - distA) / segmentDist;
        const clampedFraction = Math.max(0, Math.min(1, fraction));
        const interpElev = elevA + clampedFraction * (elevB - elevA);
        result[i] = +interpElev.toFixed(2);
      }
    }
  }

  // Handle any remaining points before the first sample or after the last sample
  const firstSample = sampleIndices[0];
  const firstElev = sampleElevations.get(firstSample) ?? points[firstSample]?.altitude ?? 0;
  for (let i = 0; i < firstSample; i++) {
    result[i] = +firstElev.toFixed(2);
  }

  const lastSample = sampleIndices[sampleIndices.length - 1];
  const lastElev = sampleElevations.get(lastSample) ?? points[lastSample]?.altitude ?? 0;
  for (let i = lastSample; i < points.length; i++) {
    result[i] = +lastElev.toFixed(2);
  }

  return result;
}

export class ElevationCorrectionService {
  private cache: Map<string, number> = new Map();
  private maxCacheSize: number = 5000;
  private customFetcher: ElevationFetcher | null = null;

  /**
   * Allows injecting a custom elevation fetcher (used in unit tests or custom endpoints).
   */
  setCustomFetcher(fetcher: ElevationFetcher | null) {
    this.customFetcher = fetcher;
  }

  /**
   * Clears the coordinate elevation cache.
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Retrieves cache size.
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Batches elevation lookup against the backend DEM service and interpolates across the full route.
   */
  async correctRouteAltitudes(
    points: Array<RoutePoint | RawGPSPoint>
  ): Promise<ElevationCorrectionResult> {
    const rawAltitudes = points.map((p) => p.altitude || 0);

    if (!points || points.length < 2) {
      return {
        success: true,
        source: 'GPS_RAW',
        correctedAltitudes: rawAltitudes,
        queryPointsCount: 0,
        cacheHitsCount: 0,
      };
    }

    // 1. Downsample to ~25m spatial resolution
    const sampleIndices = downsampleRouteIndices(points, 25);
    if (sampleIndices.length === 0) {
      return {
        success: false,
        source: 'GPS_RAW',
        correctedAltitudes: rawAltitudes,
        queryPointsCount: 0,
        cacheHitsCount: 0,
      };
    }

    // 2. Check local cache
    const uncachedIndices: number[] = [];
    const sampleElevations: Map<number, number> = new Map();
    let cacheHits = 0;

    for (const idx of sampleIndices) {
      const pt = points[idx];
      if (!isValidCoordinate(pt.latitude, pt.longitude)) {
        sampleElevations.set(idx, pt.altitude || 0);
        continue;
      }

      const key = getCoordinateCacheKey(pt.latitude, pt.longitude);
      if (this.cache.has(key)) {
        sampleElevations.set(idx, this.cache.get(key)!);
        cacheHits++;
      } else {
        uncachedIndices.push(idx);
      }
    }

    // 3. Query backend DEM service in batches of 100
    if (uncachedIndices.length > 0) {
      try {
        const BATCH_SIZE = 100;
        for (let i = 0; i < uncachedIndices.length; i += BATCH_SIZE) {
          const batchIndices = uncachedIndices.slice(i, i + BATCH_SIZE);
          const batchLocations = batchIndices.map((idx) => ({
            latitude: points[idx].latitude,
            longitude: points[idx].longitude,
          }));

          const results = await this.fetchBatchElevation(batchLocations);

          if (!results || results.length !== batchLocations.length) {
            throw new Error('DEM service returned partial or empty result batch');
          }

          for (let b = 0; b < batchIndices.length; b++) {
            const idx = batchIndices[b];
            const elev = results[b]?.elevation;

            if (typeof elev === 'number' && isFinite(elev)) {
              sampleElevations.set(idx, elev);
              const key = getCoordinateCacheKey(
                points[idx].latitude,
                points[idx].longitude
              );
              this.setCache(key, elev);
            } else {
              // Fallback to point's GPS altitude if specific coordinate elevation missing
              sampleElevations.set(idx, points[idx].altitude || 0);
            }
          }
        }
      } catch (err: any) {
        console.warn('[ElevationService] DEM lookup failed, falling back to GPS altitude:', err?.message || err);
        return {
          success: false,
          source: 'GPS_RAW',
          correctedAltitudes: rawAltitudes,
          queryPointsCount: sampleIndices.length,
          cacheHitsCount: cacheHits,
          error: err?.message || 'Network lookup failed',
        };
      }
    }

    // 4. Piecewise linear interpolation across the full route
    const correctedAltitudes = interpolateRouteAltitudes(
      points,
      sampleIndices,
      sampleElevations
    );

    return {
      success: true,
      source: 'DEM',
      correctedAltitudes,
      queryPointsCount: uncachedIndices.length,
      cacheHitsCount: cacheHits,
    };
  }

  /**
   * Fetches elevation for a batch of locations via Supabase Edge Function or custom fetcher.
   */
  private async fetchBatchElevation(
    locations: Array<{ latitude: number; longitude: number }>
  ): Promise<Array<{ latitude: number; longitude: number; elevation: number | null }>> {
    if (this.customFetcher) {
      return await this.customFetcher(locations);
    }

    // Call Supabase Edge Function proxy
    const { data, error } = await supabase.functions.invoke('elevation-lookup', {
      body: { locations },
    });

    if (error) {
      throw new Error(`Elevation function error: ${error.message}`);
    }

    if (!data || data.status !== 'OK' || !Array.isArray(data.results)) {
      throw new Error('Invalid response structure from elevation service');
    }

    return data.results;
  }

  private setCache(key: string, elevation: number) {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry (FIFO map deletion)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, elevation);
  }
}

export const elevationService = new ElevationCorrectionService();
