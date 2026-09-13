import type { RainfallContext } from '../types/zone';

/** SYNTHETIC DEMO DATA — not a real rainfall observation. */
export const RAINFALL_CONTEXT: RainfallContext = {
  zone_cell_id: 'NER-ML-042',
  station: 'IMD AWS SOHRA',
  windowLabel: '72 h CUMULATIVE',
  series: [
    { x: 0, y: 88 },
    { x: 120, y: 86 },
    { x: 240, y: 80 },
    { x: 360, y: 70 },
    { x: 470, y: 62 },
    { x: 560, y: 50 },
    { x: 640, y: 38 },
    { x: 700, y: 30 },
    { x: 780, y: 26 },
    { x: 860, y: 22 },
    { x: 940, y: 18 },
    { x: 1000, y: 16 },
  ],
  thresholdY: 34,
  crossingX: 672,
  totalLabel: 'NOW · 412 mm',
  thresholdLabel: 'THRESHOLD 300 mm',
  crossedLabel: 'CROSSED 11:20 IST · 3 h 12 m AGO',
  narrative:
    "Sohra AWS recorded 412 mm in 72 h, 218% of the seasonal normal. The 300 mm triggering threshold was crossed at 11:20 IST on 12 Sep.",
};
