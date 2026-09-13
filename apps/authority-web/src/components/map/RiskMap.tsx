import maplibregl, { type Map as MlMap } from 'maplibre-gl';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { CITIZEN_REPORT_POINTS, NER_BOUNDS, RISK_GRID } from '../../mocks/riskGrid';
import { RISK_LEVEL_HEX } from '../../utils/risk';
import { useDashboardStore } from '../../store/dashboardStore';

export interface RiskMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetNorth: () => void;
}

interface RiskMapProps {
  height: number;
  coarse?: boolean;
}

/**
 * Thin MapLibre GL wrapper standing in for the design's synthetic "ner-risk-map"
 * component. Uses CARTO's free Positron basemap (no key required) and renders
 * the mock risk grid + citizen report points from src/mocks/riskGrid.ts.
 */
const RiskMap = forwardRef<RiskMapHandle, RiskMapProps>(function RiskMap({ height, coarse }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const selectedCellId = useDashboardStore((s) => s.selectedCellId);
  const selectZone = useDashboardStore((s) => s.selectZone);

  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    resetNorth: () => mapRef.current?.easeTo({ bearing: 0, pitch: 0 }),
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      bounds: NER_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      attributionControl: false,
    });
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('risk-grid', { type: 'geojson', data: RISK_GRID as any });
      map.addLayer({
        id: 'risk-grid-fill',
        type: 'fill',
        source: 'risk-grid',
        paint: {
          'fill-color': [
            'match',
            ['get', 'risk_level'],
            'CRITICAL', RISK_LEVEL_HEX.CRITICAL,
            'HIGH', RISK_LEVEL_HEX.HIGH,
            'MODERATE', RISK_LEVEL_HEX.MODERATE,
            'LOW', RISK_LEVEL_HEX.LOW,
            'VERY_LOW', RISK_LEVEL_HEX.VERY_LOW,
            '#8A8F88',
          ],
          'fill-opacity': 0.75,
        },
      });
      map.addLayer({
        id: 'risk-grid-outline',
        type: 'line',
        source: 'risk-grid',
        paint: { 'line-color': '#1B211D', 'line-width': 1 },
      });
      map.addSource('citizen-reports', { type: 'geojson', data: CITIZEN_REPORT_POINTS as any });
      map.addLayer({
        id: 'citizen-reports-points',
        type: 'circle',
        source: 'citizen-reports',
        paint: {
          'circle-radius': 5,
          'circle-color': '#FCFBF7',
          'circle-stroke-color': '#3E463F',
          'circle-stroke-width': 1.6,
        },
      });

      map.on('click', 'risk-grid-fill', (e) => {
        const cellId = e.features?.[0]?.properties?.cell_id;
        if (cellId) selectZone(cellId);
      });
      map.on('mouseenter', 'risk-grid-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'risk-grid-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // outline the selected zone
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer('risk-grid-outline')) return;
    map.setPaintProperty('risk-grid-outline', 'line-width', [
      'case',
      ['==', ['get', 'cell_id'], selectedCellId],
      3,
      1,
    ]);
    map.setPaintProperty('risk-grid-outline', 'line-color', [
      'case',
      ['==', ['get', 'cell_id'], selectedCellId],
      '#1B211D',
      '#3E463F',
    ]);
  }, [selectedCellId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.resize();
  }, [height]);

  return <div ref={containerRef} style={{ width: '100%', height, background: coarse ? '#EEEBE3' : undefined }} />;
});

export default RiskMap;
