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

# Comprehensive Monitored Sectors across all 8 North Eastern States
NER_MONITOR_BOUNDS = [
    # 1. Sikkim - Teesta Valley & Gangtok Corridor
    {"name": "Sikkim & Teesta Valley", "min_lat": 27.0, "max_lat": 27.8, "min_lon": 88.2, "max_lon": 89.0},
    # 2. Meghalaya - Khasi Escarpment & Mawkdok Corridor
    {"name": "Meghalaya Escarpment & NH-106", "min_lat": 25.2, "max_lat": 25.8, "min_lon": 91.5, "max_lon": 92.2},
    # 3. Mizoram - Aizawl Basin & Serchhip Corridor
    {"name": "Mizoram - Aizawl Basin", "min_lat": 23.4, "max_lat": 24.2, "min_lon": 92.4, "max_lon": 93.0},
    # 4. Arunachal Pradesh - Tawang & West Kameng Corridor
    {"name": "Arunachal Pradesh - Tawang Valley", "min_lat": 27.2, "max_lat": 27.8, "min_lon": 91.8, "max_lon": 92.6},
    # 5. Nagaland - Kohima & Dzukou Corridor
    {"name": "Nagaland - Kohima Range", "min_lat": 25.4, "max_lat": 26.0, "min_lon": 93.8, "max_lon": 94.4},
    # 6. Manipur - Senapati & NH-37 Mountain Corridor
    {"name": "Manipur - Senapati Corridor", "min_lat": 24.6, "max_lat": 25.2, "min_lon": 93.6, "max_lon": 94.2},
    # 7. Tripura - Jampui Hills & North Tripura Ridge
    {"name": "Tripura - Jampui Hills", "min_lat": 23.8, "max_lat": 24.4, "min_lon": 91.8, "max_lon": 92.4},
    # 8. Assam - Dima Hasao & Haflong Hill Tracts
    {"name": "Assam - Dima Hasao Escarpment", "min_lat": 25.0, "max_lat": 25.6, "min_lon": 92.8, "max_lon": 93.4},
]


def run_monitoring_cycle(runner: OperationalPipelineRunner) -> None:
    """Executes a full monitoring cycle across all 8 North Eastern state sectors."""
    logger.info("================================================================")
    logger.info("🚀 EXECUTING AUTOMATED REGIONAL RISK INGESTION & MONITORING CYCLE")
    logger.info("📡 COVERAGE: ALL 8 NORTH EASTERN STATES (Sikkim, Meghalaya, Mizoram, Arunachal, Nagaland, Manipur, Tripura, Assam)")
    logger.info("================================================================")

    output_path = PROJECT_ROOT / "data" / "processed" / "risk_grid_latest.geojson"
    res = runner.run_multi_sector_cycle(NER_MONITOR_BOUNDS, step_deg=0.25, output_geojson_path=output_path)

    logger.info(f"✅ Ingestion cycle complete: {res['cells_processed']} cells processed across {len(NER_MONITOR_BOUNDS)} state sectors in {res['duration_seconds']:.2f}s.")
    logger.info(f"Risk Grid updated: {output_path}\n")


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
