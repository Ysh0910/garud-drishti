import { MOCK_RISK_CELLS, MockRiskCell } from './mockRiskData';
import { BoundingBox } from '../repositories/geo';

// ============================================================================
// ML Adapter Interface Boundary
// Isolates model inference / precomputed outputs from the HTTP API.
// ============================================================================

export interface IMLAdapter {
  getPointPrediction(lat: number, lon: number): Promise<MockRiskCell | null>;
  getGridPredictions(bbox: BoundingBox, minRisk?: number): Promise<MockRiskCell[]>;
  getZonePrediction(cellId: string): Promise<MockRiskCell | null>;
}

export class MockMLAdapter implements IMLAdapter {
  async getPointPrediction(lat: number, lon: number): Promise<MockRiskCell | null> {
    // Find containing or closest mock cell
    for (const cell of MOCK_RISK_CELLS) {
      const ring = cell.geometry.coordinates[0];
      const minLon = Math.min(...ring.map((c) => c[0]));
      const maxLon = Math.max(...ring.map((c) => c[0]));
      const minLat = Math.min(...ring.map((c) => c[1]));
      const maxLat = Math.max(...ring.map((c) => c[1]));

      if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) {
        return cell;
      }
    }

    // Default fallback to first mock cell if within NER broad bounds
    if (lat >= 25 && lat <= 29 && lon >= 88 && lon <= 96) {
      return MOCK_RISK_CELLS[0];
    }

    return null;
  }

  async getGridPredictions(bbox: BoundingBox, minRisk?: number): Promise<MockRiskCell[]> {
    return MOCK_RISK_CELLS.filter((cell) => {
      if (minRisk !== undefined && cell.current_risk < minRisk) {
        return false;
      }

      const ring = cell.geometry.coordinates[0];
      const minLon = Math.min(...ring.map((c) => c[0]));
      const maxLon = Math.max(...ring.map((c) => c[0]));
      const minLat = Math.min(...ring.map((c) => c[1]));
      const maxLat = Math.max(...ring.map((c) => c[1]));

      // Check overlap with bbox
      const noOverlap =
        maxLon < bbox.west ||
        minLon > bbox.east ||
        maxLat < bbox.south ||
        minLat > bbox.north;

      return !noOverlap;
    });
  }

  async getZonePrediction(cellId: string): Promise<MockRiskCell | null> {
    const found = MOCK_RISK_CELLS.find((c) => c.cell_id === cellId);
    return found || null;
  }
}

export const mockMlAdapter = new MockMLAdapter();
