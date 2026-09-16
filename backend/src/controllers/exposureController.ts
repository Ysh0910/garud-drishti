import { Request, Response, NextFunction } from 'express';
import { exposureService } from '../services/exposureService';
import { AssetType } from '../types';
import { BoundingBox } from '../repositories/geo';

export class ExposureController {
  /**
   * GET /api/v1/assets/nearby?latitude=...&longitude=...&radius_m=...&asset_type=...
   */
  async getNearbyAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lat = parseFloat(req.query.latitude as string);
      const lon = parseFloat(req.query.longitude as string);
      const radiusM =
        req.query.radius_m !== undefined ? Number(req.query.radius_m) : 5000;
      const assetType = req.query.asset_type as AssetType | undefined;

      const result = await exposureService.getNearbyAssets(lat, lon, radiusM, assetType);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/roads/risk?bbox=...&min_risk=...
   */
  async getRoadsWithRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let bbox: BoundingBox | undefined;
      if (req.query.bbox) {
        if (typeof req.query.bbox === 'object') {
          bbox = req.query.bbox as unknown as BoundingBox;
        } else if (typeof req.query.bbox === 'string') {
          const parts = (req.query.bbox as string).split(',').map(Number);
          if (parts.length === 4 && !parts.some(Number.isNaN)) {
            bbox = { west: parts[0], south: parts[1], east: parts[2], north: parts[3] };
          }
        }
      }

      const minRisk =
        req.query.min_risk !== undefined ? Number(req.query.min_risk) : undefined;

      const result = await exposureService.getRoadsWithRisk(bbox, minRisk);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/villages/risk?bbox=...&min_risk=...
   */
  async getVillagesWithRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let bbox: BoundingBox | undefined;
      if (req.query.bbox) {
        if (typeof req.query.bbox === 'object') {
          bbox = req.query.bbox as unknown as BoundingBox;
        } else if (typeof req.query.bbox === 'string') {
          const parts = (req.query.bbox as string).split(',').map(Number);
          if (parts.length === 4 && !parts.some(Number.isNaN)) {
            bbox = { west: parts[0], south: parts[1], east: parts[2], north: parts[3] };
          }
        }
      }

      const minRisk =
        req.query.min_risk !== undefined ? Number(req.query.min_risk) : undefined;

      const result = await exposureService.getVillagesWithRisk(bbox, minRisk);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const exposureController = new ExposureController();
