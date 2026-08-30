#!/usr/bin/env bash
# ==============================================================================
# LifeOS Elevation Dataset Downloader: Karnataka, Goa, and Kerala Coastal Region
# Data Source: Copernicus DEM GLO-30 (European Space Agency / AWS Registry of Open Data)
# Resolution: 30m / 1 arc-second
# Bounding Box: ~8°N to 16°N Latitude, ~73°E to 78°E Longitude
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${SCRIPT_DIR}/../data/copernicus-glo-30"

mkdir -p "${TARGET_DIR}"

echo "======================================================================"
echo "LifeOS: Downloading Copernicus GLO-30 DEM Tiles (Karnataka/Goa/Kerala)"
echo "Target Directory: ${TARGET_DIR}"
echo "======================================================================"

# AWS Copernicus S3 base URL (Open Data, no AWS credentials required)
S3_BASE_URL="https://copernicus-dem-30m.s3.amazonaws.com"

# Coordinates defining the coastal corridor:
# Latitudes: 08, 09, 10, 11, 12, 13, 14, 15, 16
# Longitudes: 073, 074, 075, 076, 077, 078

TILES=(
  "Copernicus_DSM_COG_10_N08_00_E076_00_DEM"
  "Copernicus_DSM_COG_10_N08_00_E077_00_DEM"
  "Copernicus_DSM_COG_10_N09_00_E076_00_DEM"
  "Copernicus_DSM_COG_10_N09_00_E077_00_DEM"
  "Copernicus_DSM_COG_10_N10_00_E075_00_DEM"
  "Copernicus_DSM_COG_10_N10_00_E076_00_DEM"
  "Copernicus_DSM_COG_10_N10_00_E077_00_DEM"
  "Copernicus_DSM_COG_10_N11_00_E075_00_DEM"
  "Copernicus_DSM_COG_10_N11_00_E076_00_DEM"
  "Copernicus_DSM_COG_10_N11_00_E077_00_DEM"
  "Copernicus_DSM_COG_10_N12_00_E074_00_DEM"
  "Copernicus_DSM_COG_10_N12_00_E075_00_DEM"
  "Copernicus_DSM_COG_10_N12_00_E076_00_DEM"
  "Copernicus_DSM_COG_10_N12_00_E077_00_DEM"
  "Copernicus_DSM_COG_10_N13_00_E074_00_DEM"
  "Copernicus_DSM_COG_10_N13_00_E075_00_DEM"
  "Copernicus_DSM_COG_10_N13_00_E076_00_DEM"
  "Copernicus_DSM_COG_10_N13_00_E077_00_DEM"
  "Copernicus_DSM_COG_10_N14_00_E074_00_DEM"
  "Copernicus_DSM_COG_10_N14_00_E075_00_DEM"
  "Copernicus_DSM_COG_10_N14_00_E076_00_DEM"
  "Copernicus_DSM_COG_10_N15_00_E073_00_DEM"
  "Copernicus_DSM_COG_10_N15_00_E074_00_DEM"
  "Copernicus_DSM_COG_10_N15_00_E075_00_DEM"
  "Copernicus_DSM_COG_10_N16_00_E073_00_DEM"
  "Copernicus_DSM_COG_10_N16_00_E074_00_DEM"
)

TOTAL=${#TILES[@]}
COUNT=0

for TILE in "${TILES[@]}"; do
  COUNT=$((COUNT + 1))
  FILE_NAME="${TILE}.tif"
  TARGET_PATH="${TARGET_DIR}/${FILE_NAME}"

  if [ -f "${TARGET_PATH}" ]; then
    echo "[${COUNT}/${TOTAL}] ${FILE_NAME} already exists, skipping."
    continue
  fi

  URL="${S3_BASE_URL}/${TILE}/${TILE}.tif"
  echo "[${COUNT}/${TOTAL}] Fetching ${FILE_NAME}..."
  
  if curl -f -L -s -S "${URL}" -o "${TARGET_PATH}"; then
    echo "  -> Saved ${FILE_NAME}"
  else
    echo "  -> Note: Tile ${TILE} not available on S3 or oceanic tile (sea level = 0m)."
    rm -f "${TARGET_PATH}"
  fi
done

echo "======================================================================"
echo "Download complete! Total DEM tiles saved to ${TARGET_DIR}"
echo "======================================================================"
