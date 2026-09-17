"""
ml/ingestion/pipeline_runner.py
-------------------------------
Operational Pipeline Runner for Environmental Data Ingestion & Risk Grid Batch Updates.
Executes scheduled ingestion:
Providers -> QC Engine -> Observation Store -> Rolling Features -> ML Predictor -> Export GeoJSON
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import argparse
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from ml.ingestion.providers.imd_provider import IMDProvider
from ml.ingestion.providers.gpm_provider import GPMProvider
from ml.ingestion.providers.smap_provider import SMAPProvider
from ml.ingestion.providers.sentinel_provider import SentinelProvider
from ml.ingestion.providers.mock_provider import MockProvider
from ml.ingestion.qc import QualityControlEngine
from ml.ingestion.observation_store import observation_store
from ml.feature_engineering.feature_store import feature_store
from ml.inference.predictor import GarudDrishtiInferenceEngine
LOGS_DIR = PROJECT_ROOT / "data" / "processed"

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("PipelineRunner")


class OperationalPipelineRunner:
    """
    Orchestrates periodic batch ingestion and spatial grid inference.
    """
    def __init__(self):
        self.feature_store = feature_store
        self.inference_engine = GarudDrishtiInferenceEngine()

    def run_ingestion_cycle(
        self,
        bbox: Dict[str, float],
        step_deg: float = 0.25,
        output_geojson_path: Optional[Path] = None
    ) -> Dict[str, Any]:
        """
        Executes complete ingestion and inference cycle for specified bounding box.
        """
        start_time = datetime.now(timezone.utc)
        logger.info(f"Starting Data Ingestion & Inference Cycle for BBox: {bbox}")

        features_geojson: List[Dict[str, Any]] = []
        cell_count = 0

        curr_lat = bbox["min_lat"]
        while curr_lat <= bbox["max_lat"]:
            curr_lon = bbox["min_lon"]
            while curr_lon <= bbox["max_lon"]:
                cell_id = f"NER_CELL_{int(curr_lat*100)}_{int(curr_lon*100)}"

                # 1. Build Static Features & Model 1 Inference
                static_df, terrain_meta = self.feature_store.build_static_features(curr_lat, curr_lon)
                susc_res = self.inference_engine.predict_base_susceptibility(static_df)[0]
                base_susc = susc_res["base_susceptibility"]

                # 2. Build Dynamic Features & Model 2 Inference
                dynamic_df, dyn_meta, quality_state = self.feature_store.build_dynamic_features(
                    curr_lat, curr_lon, base_susc, start_time
                )
                risk_res = self.inference_engine.predict_dynamic_risk(dynamic_df)[0]

                # 3. Assemble GeoJSON Polygon Feature (0.25 deg cell box)
                half = step_deg / 2.0
                poly_coords = [[
                    [round(curr_lon - half, 4), round(curr_lat - half, 4)],
                    [round(curr_lon + half, 4), round(curr_lat - half, 4)],
                    [round(curr_lon + half, 4), round(curr_lat + half, 4)],
                    [round(curr_lon - half, 4), round(curr_lat + half, 4)],
                    [round(curr_lon - half, 4), round(curr_lat - half, 4)],
                ]]

                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": poly_coords
                    },
                    "properties": {
                        "cell_id": cell_id,
                        "latitude": round(curr_lat, 4),
                        "longitude": round(curr_lon, 4),
                        "state": terrain_meta["state"],
                        "elevation_m": terrain_meta["elevation_m"],
                        "slope_deg": terrain_meta["slope_deg"],
                        "base_susceptibility": base_susc,
                        "current_risk": risk_res["current_risk"],
                        "risk_level": risk_res["current_risk_level"],
                        "risk_24h": risk_res["risk_24h"],
                        "risk_24h_level": risk_res["risk_24h_level"],
                        "data_quality": quality_state.value,
                        "rainfall_24h_mm": dynamic_df["rainfall_24h_mm"].iloc[0],
                        "rainfall_72h_mm": dynamic_df["rainfall_72h_mm"].iloc[0],
                        "soil_moisture": dynamic_df["soil_moisture"].iloc[0],
                        "model_version": risk_res["model_version"],
                        "updated_at": start_time.isoformat()
                    }
                }
                features_geojson.append(feature)
                cell_count += 1
                curr_lon += step_deg
            curr_lat += step_deg

        geojson_payload = {
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
            },
            "meta": {
                "generated_at": start_time.isoformat(),
                "total_cells": cell_count,
                "bbox": bbox,
            },
            "features": features_geojson
        }

        # Save to disk if requested
        if output_geojson_path:
            output_geojson_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_geojson_path, "w", encoding="utf-8") as f:
                json.dump(geojson_payload, f, indent=2)
            logger.info(f"Saved risk grid GeoJSON to: {output_geojson_path}")

        duration_sec = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.info(f"Cycle completed: {cell_count} cells processed in {duration_sec:.2f}s")

        return {
            "status": "success",
            "cells_processed": cell_count,
            "duration_seconds": duration_sec,
            "generated_at": start_time.isoformat(),
            "features": features_geojson,
        }

    def run_multi_sector_cycle(
        self,
        sectors: List[Dict[str, Any]],
        step_deg: float = 0.25,
        output_geojson_path: Optional[Path] = None
    ) -> Dict[str, Any]:
        """
        Executes complete environmental data ingestion and ML risk inference
        across all defined North Eastern state sectors, saving a unified GeoJSON dataset.
        """
        start_time = datetime.now(timezone.utc)
        logger.info(f"Starting Multi-Sector Ingestion & Inference across {len(sectors)} state sectors")

        all_features: List[Dict[str, Any]] = []
        total_cells = 0

        for sector in sectors:
            logger.info(f"Sensing sector: {sector['name']} (BBox: {sector['min_lat']},{sector['min_lon']} to {sector['max_lat']},{sector['max_lon']})")
            bbox = {
                "min_lat": sector["min_lat"],
                "max_lat": sector["max_lat"],
                "min_lon": sector["min_lon"],
                "max_lon": sector["max_lon"],
            }
            res = self.run_ingestion_cycle(bbox, step_deg=step_deg, output_geojson_path=None)
            sector_features = res.get("features", [])
            all_features.extend(sector_features)
            total_cells += len(sector_features)

        geojson_payload = {
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
            },
            "meta": {
                "generated_at": start_time.isoformat(),
                "total_cells": total_cells,
                "total_sectors": len(sectors),
            },
            "features": all_features
        }

        if output_geojson_path:
            output_geojson_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_geojson_path, "w", encoding="utf-8") as f:
                json.dump(geojson_payload, f, indent=2)
            logger.info(f"Saved consolidated regional risk grid ({total_cells} cells) to: {output_geojson_path}")

        duration_sec = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.info(f"Multi-sector cycle completed: {total_cells} cells processed across {len(sectors)} sectors in {duration_sec:.2f}s")

        return {
            "status": "success",
            "cells_processed": total_cells,
            "duration_seconds": duration_sec,
            "generated_at": start_time.isoformat()
        }


def main():
    parser = argparse.ArgumentParser(description="GARUD DRISHTI Data Ingestion & Grid Inference Runner")
    parser.add_argument("--min-lat", type=float, default=26.5, help="Min Latitude")
    parser.add_argument("--max-lat", type=float, default=28.0, help="Max Latitude")
    parser.add_argument("--min-lon", type=float, default=88.0, help="Min Longitude")
    parser.add_argument("--max-lon", type=float, default=89.5, help="Max Longitude")
    parser.add_argument("--step", type=float, default=0.25, help="Grid Step in Degrees")
    parser.add_argument("--output", type=str, default="data/processed/risk_grid_latest.geojson", help="Output GeoJSON path")

    args = parser.parse_args()
    bbox = {
        "min_lat": args.min_lat,
        "max_lat": args.max_lat,
        "min_lon": args.min_lon,
        "max_lon": args.max_lon,
    }

    runner = OperationalPipelineRunner()
    out_path = PROJECT_ROOT / args.output
    res = runner.run_ingestion_cycle(bbox, step_deg=args.step, output_geojson_path=out_path)
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
