import {
  ElevationCorrectionService,
  downsampleRouteIndices,
  getCoordinateCacheKey,
  interpolateRouteAltitudes,
} from '../services/elevation';
import { RoutePoint } from '../types';

describe('Elevation Correction Service (Copernicus GLO-30 DEM & Spatial Downsampling)', () => {
  let elevationService: ElevationCorrectionService;

  beforeEach(() => {
    elevationService = new ElevationCorrectionService();
    elevationService.clearCache();
  });

  describe('Spatial Route Downsampling (~25m stride matching DEM native resolution)', () => {
    it('downsamples high-density GPS track to ~25m spatial intervals', () => {
      // 1000m synthetic route (approx 0.009 degrees lat) with 1000 points (1 point per meter)
      const denseRoute: Array<{ latitude: number; longitude: number }> = [];
      for (let i = 0; i <= 1000; i++) {
        denseRoute.push({
          latitude: 12.9700 + (i * 0.009) / 1000,
          longitude: 77.5900,
        });
      }

      const indices = downsampleRouteIndices(denseRoute, 25);

      // In a 1000m track at 25m intervals, we expect ~40-42 sample indices
      expect(indices.length).toBeGreaterThanOrEqual(38);
      expect(indices.length).toBeLessThanOrEqual(45);

      // Must anchor first and last points
      expect(indices[0]).toBe(0);
      expect(indices[indices.length - 1]).toBe(1000);
    });

    it('preserves small routes (<= 2 points) without downsampling', () => {
      const shortRoute = [
        { latitude: 12.97, longitude: 77.59 },
        { latitude: 12.98, longitude: 77.59 },
      ];
      const indices = downsampleRouteIndices(shortRoute, 25);
      expect(indices).toEqual([0, 1]);
    });
  });

  describe('Piecewise Linear Altitude Interpolation', () => {
    it('interpolates elevations continuously between sample anchors', () => {
      // 5 points spaced along a line
      const points = [
        { latitude: 12.970, longitude: 77.590, altitude: 100 },
        { latitude: 12.971, longitude: 77.590, altitude: 100 },
        { latitude: 12.972, longitude: 77.590, altitude: 100 },
        { latitude: 12.973, longitude: 77.590, altitude: 100 },
        { latitude: 12.974, longitude: 77.590, altitude: 100 },
      ];

      // Sample anchors at index 0 (elev=200m) and index 4 (elev=400m)
      const sampleIndices = [0, 4];
      const sampleElevations = new Map<number, number>([
        [0, 200],
        [4, 400],
      ]);

      const interpolated = interpolateRouteAltitudes(points, sampleIndices, sampleElevations);

      expect(interpolated.length).toBe(5);
      expect(interpolated[0]).toBe(200);
      expect(interpolated[4]).toBe(400);

      // Intermediate point (index 2 = midway) should be ~300m
      expect(interpolated[2]).toBeCloseTo(300, 0);

      // Monotonically increasing
      for (let i = 1; i < interpolated.length; i++) {
        expect(interpolated[i]).toBeGreaterThan(interpolated[i - 1]);
      }
    });
  });

  describe('Coordinate Cache Grid Key', () => {
    it('quantizes coordinates to ~11m grid resolution (4 decimal places)', () => {
      const key1 = getCoordinateCacheKey(12.971612, 77.594634);
      const key2 = getCoordinateCacheKey(12.971649, 77.594601);
      expect(key1).toBe('12.9716,77.5946');
      expect(key2).toBe('12.9716,77.5946');
      expect(key1).toBe(key2); // Nearby coordinates share cache cell
    });
  });

  describe('DEM Elevation Correction Pipeline with Custom Mock Fetcher', () => {
    it('successfully queries DEM and applies corrected elevations', async () => {
      const mockRoute: RoutePoint[] = [
        { latitude: 12.9700, longitude: 77.5900, altitude: 100, timestamp: 1000 },
        { latitude: 12.9705, longitude: 77.5900, altitude: 105, timestamp: 2000 },
        { latitude: 12.9710, longitude: 77.5900, altitude: 110, timestamp: 3000 },
      ];

      // Inject custom mock DEM fetcher (simulating Copernicus GLO-30 lookup)
      elevationService.setCustomFetcher(async (locations) => {
        return locations.map((loc) => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          elevation: 920.0 + loc.latitude * 10,
        }));
      });

      const result = await elevationService.correctRouteAltitudes(mockRoute);

      expect(result.success).toBe(true);
      expect(result.source).toBe('DEM');
      expect(result.correctedAltitudes.length).toBe(3);
      expect(result.correctedAltitudes[0]).toBeGreaterThan(900); // DEM elevated
      expect(elevationService.getCacheSize()).toBeGreaterThan(0);
    });

    it('caches repeated locations to avoid redundant network queries', async () => {
      let networkQueries = 0;
      elevationService.setCustomFetcher(async (locations) => {
        networkQueries += locations.length;
        return locations.map((loc) => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          elevation: 500.0,
        }));
      });

      const route = [
        { latitude: 15.2993, longitude: 74.1240, altitude: 10, timestamp: 1000 },
        { latitude: 15.3000, longitude: 74.1240, altitude: 12, timestamp: 2000 },
      ];

      // First run: queries network
      await elevationService.correctRouteAltitudes(route);
      const initialQueries = networkQueries;
      expect(initialQueries).toBeGreaterThan(0);

      // Second run on same coordinates: hits cache (zero new network queries)
      await elevationService.correctRouteAltitudes(route);
      expect(networkQueries).toBe(initialQueries);
    });

    it('gracefully falls back to raw GPS altitude when DEM service is unreachable', async () => {
      elevationService.setCustomFetcher(async () => {
        throw new Error('Self-hosted Open Topo Data server unreachable (502)');
      });

      const rawAltitudes = [100, 115, 125];
      const route: RoutePoint[] = [
        { latitude: 12.9700, longitude: 77.5900, altitude: rawAltitudes[0], timestamp: 1000 },
        { latitude: 12.9705, longitude: 77.5900, altitude: rawAltitudes[1], timestamp: 2000 },
        { latitude: 12.9710, longitude: 77.5900, altitude: rawAltitudes[2], timestamp: 3000 },
      ];

      const result = await elevationService.correctRouteAltitudes(route);

      // Must NOT throw or fail the entire activity
      expect(result.success).toBe(false);
      expect(result.source).toBe('GPS_RAW');
      expect(result.correctedAltitudes).toEqual(rawAltitudes);
    });
  });
});
