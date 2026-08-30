# Open Topo Data (Copernicus GLO-30 DEM) for LifeOS

This directory contains the Docker configuration and regional Copernicus GLO-30 elevation dataset setup for LifeOS.

---

## 1. Overview & Dataset

- **Engine**: [Open Topo Data](https://github.com/ajnisbet/opentopodata) (MIT Licensed, REST API with bilinear interpolation).
- **Elevation Dataset**: **Copernicus DEM GLO-30** (European Space Agency / AWS Registry of Open Data).
- **Native Resolution**: 30 meters / 1 arc-second.
- **Initial Region**: Karnataka, Goa, and Kerala coastal corridor (~8°N to 16°N Latitude, ~73°E to 78°E Longitude).
- **Storage Footprint**: ~26 GeoTIFF tiles ($\approx 500\text{ MB}$ total).

---

## 2. Quickstart

### Step 1: Download Regional Tiles
```bash
chmod +x scripts/download_karnataka_goa_kerala.sh
./scripts/download_karnataka_goa_kerala.sh
```

### Step 2: Start Docker Container
```bash
docker compose up -d
```

### Step 3: Verify Health & Elevation Lookup
```bash
# Check service health
curl http://localhost:5000/health

# Query sample coordinate (Bangalore: 12.9716, 77.5946)
curl "http://localhost:5000/v1/copernicus-glo-30?locations=12.9716,77.5946"
```

Expected output:
```json
{
  "results": [
    {
      "dataset": "copernicus-glo-30",
      "elevation": 920.5,
      "location": {
        "lat": 12.9716,
        "lng": 77.5946
      }
    }
  ],
  "status": "OK"
}
```

---

## 3. Expanding to New Regions

To add coverage for additional regions (e.g. Maharashtra, Tamil Nadu, Himachal Pradesh):
1. Identify the bounding latitude and longitude boxes (e.g., $18^\circ\text{N}-20^\circ\text{N}$, $72^\circ\text{E}-75^\circ\text{E}$).
2. Download the matching Copernicus GLO-30 GeoTIFFs into `data/copernicus-glo-30/`.
3. Restart or reload Open Topo Data. No code or schema changes are needed.
