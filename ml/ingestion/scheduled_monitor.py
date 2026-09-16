"""
ml/ingestion/scheduled_monitor.py
----------------------------------
Continuous Environmental Risk Ingestion & Alert Monitoring Service for North Eastern India.
Executes periodic ingestion batches, updates PostGIS risk cells, evaluates hazard thresholds,
and triggers automatic emergency alert notifications.
"""

import sys
import time
import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.ingestion.pipeline_runner import OperationalPipelineRunner

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s")
logger = logging.getLogger("ScheduledMonitor")

# Pilot Bounding Boxes across North Eastern Region
NER_MONITOR_BOUNDS = [
    # 1. Sikkim - North Bengal High Risk Corridor
    {"name": "Sikkim & Teesta Valley", "min_lat": 27.0, "max_lat": 27.8, "min_lon": 88.2, "max_lon": 89.0},
    # 2. Meghalaya Escarpment & NH-106 Corridor
    {"name": "Meghalaya Escarpment & Mawkdok", "min_lat": 25.2, "max_lat": 25.8, "min_lon": 91.5, "max_lon": 92.2},
    # 3. Mizoram & Barak Basin Corridor
    {"name": "Mizoram - Aizawl Basin", "min_lat": 23.4, "max_lat": 24.2, "min_lon": 92.4, "max_lon": 93.0},
]


def run_monitoring_cycle(runner: OperationalPipelineRunner) -> None:
    """Executes a full monitoring cycle across key regional corridors."""
    logger.info("================================================================")
    logger.info("🚀 EXECUTING AUTOMATED REGIONAL RISK INGESTION & MONITORING CYCLE")
    logger.info("================================================================")

    total_cells = 0
    cycle_start = time.time()

    for sector in NER_MONITOR_BOUNDS:
        logger.info(f"Sensing sector: {sector['name']} (BBox: {sector['min_lat']},{sector['min_lon']} to {sector['max_lat']},{sector['max_lon']})")
        bbox = {
            "min_lat": sector["min_lat"],
            "max_lat": sector["max_lat"],
            "min_lon": sector["min_lon"],
            "max_lon": sector["max_lon"],
        }
        res = runner.run_ingestion_cycle(bbox, step_deg=0.25)
        total_cells += res.get("cells_processed", 0)

    duration = time.time() - cycle_start
    logger.info(f"✅ Ingestion cycle complete: {total_cells} cells processed in {duration:.2f}s across NER corridors.")
    logger.info(f"Risk Grid updated: {PROJECT_ROOT / 'data' / 'processed' / 'risk_grid_latest.geojson'}\n")


def start_daemon(interval_seconds: int = 300, single_run: bool = False):
    runner = OperationalPipelineRunner()
    logger.info(f"Starting Garud Drishti Ingestion Monitor (Interval: {interval_seconds}s, Single-run: {single_run})")

    if single_run:
        run_monitoring_cycle(runner)
        return

    while True:
        try:
            run_monitoring_cycle(runner)
        except Exception as e:
            logger.error(f"Error during ingestion cycle: {e}", exc_info=True)

        logger.info(f"Sleeping for {interval_seconds} seconds until next scheduled sensor ingestion...")
        time.sleep(interval_seconds)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Garud Drishti Scheduled Risk Monitor")
    parser.add_argument("--interval", type=int, default=300, help="Monitoring interval in seconds (default: 300s)")
    parser.add_argument("--once", action="store_true", help="Run a single cycle and exit")
    args = parser.parse_args()

    start_daemon(interval_seconds=args.interval, single_run=args.once)
