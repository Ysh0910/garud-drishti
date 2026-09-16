import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import maplibregl, { type Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { buildDistrictAggregates, NER_BOUNDS, RISK_GRID, STATE_BOUNDS } from '../../mocks/riskGrid';
import { useReports, useRiskGrid } from '../../hooks/api';
import { RISK_LEVEL_HEX } from '../../utils/risk';
import { useDashboardStore } from '../../store/dashboardStore';

function reportsToGeoJson(
  reports: { report_id: string; latitude: number; longitude: number; status: string }[],
): FeatureCollection<Point, { report_id: string; status: string }> {
  return {
    type: 'FeatureCollection',
    features: reports.map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
      properties: { report_id: r.report_id, status: r.status },
    })),
  };
}

/** Converts polygon risk grid into centroid points for MapLibre circle rendering & point clustering */
function gridToCentroidPoints(
  grid: FeatureCollection<Polygon, any>,
): FeatureCollection<Point, any> {
  const features: Feature<Point, any>[] = [];

  for (const f of grid.features || []) {
    const ring = f.geometry?.coordinates?.[0] || [];
    if (!ring.length) continue;
    const centerLon = ring.reduce((acc, c) => acc + c[0], 0) / ring.length;
    const centerLat = ring.reduce((acc, c) => acc + c[1], 0) / ring.length;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [centerLon, centerLat],
      },
      properties: {
        ...f.properties,
        centerLon,
        centerLat,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/** 8x8 diagonal-stripe pattern used to texture low-confidence zones — see confidence legend. */
function createDiagonalHatchImage(): ImageData {
  const size = 8;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = 'rgba(27,33,29,0.5)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  // Two diagonal segments so the stripe tiles seamlessly at every edge.
  ctx.moveTo(-1, size + 1);
  ctx.lineTo(size + 1, -1);
  ctx.moveTo(-1, size / 2 - size);
  ctx.lineTo(size / 2, -1);
  ctx.moveTo(size / 2, size + 1);
  ctx.lineTo(size + 1, size / 2);
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

function applyRiskLayerVisibility(map: MlMap, activeMapLayer: string, coarse: boolean) {
  const showDetail = activeMapLayer === 'RISK' && !coarse ? 'visible' : 'none';
  const showAggregate = activeMapLayer === 'RISK' && coarse ? 'visible' : 'none';
  const showInventory = activeMapLayer === 'INVENTORY' ? 'visible' : 'none';
  const set = (id: string, v: string) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v);
  };
  set('risk-grid-fill', showDetail);
  set('risk-grid-outline', showDetail);
  set('risk-grid-hatch', showDetail);
  set('risk-grid-outline-unknown', showDetail);
  set('risk-clusters', showDetail);
  set('risk-cluster-count', showDetail);
  set('risk-points-halo', showDetail);
  set('risk-points-circle', showDetail);
  set('risk-points-label', showDetail);
  set('district-aggregate-circle', showAggregate);
  set('district-aggregate-label', showAggregate);
  set('landslide-heat', showInventory);
  set('landslide-points', showInventory);
}

export interface RiskMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetNorth: () => void;
  fitNer: () => void;
}

interface RiskMapProps {
  height: number;
  coarse?: boolean;
}

/**
 * Interactive MapLibre GL console map.
 * - Supports pan, zoom, touch/pinch, smooth click selection.
 * - Point clustering at low zoom (< 7) with MapLibre's built-in clustering.
 * - At higher zoom (>= 7), displays interactive risk circles colored by RiskLevel
 *   with embedded risk score badges and restrained halos for CRITICAL/HIGH zones.
 * - Muted polygon fill layer beneath gives terrain context for cell boundaries.
 */
const RiskMap = forwardRef<RiskMapHandle, RiskMapProps>(function RiskMap({ height, coarse }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const selectedCellId = useDashboardStore((s) => s.selectedCellId);
  const selectZone = useDashboardStore((s) => s.selectZone);
  const selectedState = useDashboardStore((s) => s.selectedState);
  const activeMapLayer = useDashboardStore((s) => s.activeMapLayer);
  const isFirstJump = useRef(true);
  const { data: reports } = useReports();
  const { data: riskGridData } = useRiskGrid();

  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    resetNorth: () => mapRef.current?.easeTo({ bearing: 0, pitch: 0 }),
    fitNer: () => mapRef.current?.fitBounds(NER_BOUNDS, { padding: 32, duration: 800 }),
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
      if (!map.hasImage('diag-hatch')) {
        map.addImage('diag-hatch', createDiagonalHatchImage());
      }

      const initialGrid = riskGridData ?? (RISK_GRID as any);
      const initialPoints = gridToCentroidPoints(initialGrid);

      // 1. Polygon risk grid source (background spatial boundary context)
      map.addSource('risk-grid', { type: 'geojson', data: initialGrid });

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
          'fill-opacity': ['match', ['get', 'confidence_tier'], 'unknown', 0.12, 0.22],
        },
      });

      // Diagonal hatch overlay for low-confidence zones
      map.addLayer({
        id: 'risk-grid-hatch',
        type: 'fill',
        source: 'risk-grid',
        filter: ['==', ['get', 'confidence_tier'], 'low'],
        paint: { 'fill-pattern': 'diag-hatch', 'fill-opacity': 0.35 },
      });

      map.addLayer({
        id: 'risk-grid-outline',
        type: 'line',
        source: 'risk-grid',
        paint: { 'line-color': '#1B211D', 'line-width': 1, 'line-opacity': 0.4 },
      });

      map.addLayer({
        id: 'risk-grid-outline-unknown',
        type: 'line',
        source: 'risk-grid',
        filter: ['==', ['get', 'confidence_tier'], 'unknown'],
        paint: { 'line-color': '#8A8F88', 'line-width': 1.5, 'line-dasharray': [2, 2], 'line-opacity': 0.6 },
      });

      // 2. Centroid points source with MapLibre point clustering at low zoom (< 7)
      map.addSource('risk-grid-points', {
        type: 'geojson',
        data: initialPoints as any,
        cluster: true,
        clusterMaxZoom: 7,
        clusterRadius: 45,
      });

      // Cluster bubbles for low zoom
      map.addLayer({
        id: 'risk-clusters',
        type: 'circle',
        source: 'risk-grid-points',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#24312B',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            16,
            4, 20,
            10, 26,
            20, 32,
          ],
          'circle-stroke-color': '#FCFBF7',
          'circle-stroke-width': 2,
          'circle-opacity': 0.92,
        },
      });

      map.addLayer({
        id: 'risk-cluster-count',
        type: 'symbol',
        source: 'risk-grid-points',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 11.5,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#FCFBF7',
        },
      });

      // Subtle halo for CRITICAL and HIGH unclustered points
      map.addLayer({
        id: 'risk-points-halo',
        type: 'circle',
        source: 'risk-grid-points',
        filter: [
          'all',
          ['!', ['has', 'point_count']],
          ['in', ['get', 'risk_level'], ['literal', ['CRITICAL', 'HIGH']]],
        ],
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 17,
            10, 23,
            14, 29,
          ],
          'circle-color': [
            'match',
            ['get', 'risk_level'],
            'CRITICAL', RISK_LEVEL_HEX.CRITICAL,
            'HIGH', RISK_LEVEL_HEX.HIGH,
            'transparent',
          ],
          'circle-opacity': 0.28,
        },
      });

      // Individual risk zone circle marker
      map.addLayer({
        id: 'risk-points-circle',
        type: 'circle',
        source: 'risk-grid-points',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 10,
            10, 14,
            14, 18,
          ],
          'circle-color': [
            'match',
            ['get', 'risk_level'],
            'CRITICAL', RISK_LEVEL_HEX.CRITICAL,
            'HIGH', RISK_LEVEL_HEX.HIGH,
            'MODERATE', RISK_LEVEL_HEX.MODERATE,
            'LOW', RISK_LEVEL_HEX.LOW,
            'VERY_LOW', RISK_LEVEL_HEX.VERY_LOW,
            '#8A8F88',
          ],
          'circle-stroke-color': '#FCFBF7',
          'circle-stroke-width': 2,
          'circle-opacity': 0.96,
        },
      });

      // Numeric risk score inside the marker circle
      map.addLayer({
        id: 'risk-points-label',
        type: 'symbol',
        source: 'risk-grid-points',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['to-string', ['round', ['get', 'risk_score']]],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 9.5,
            10, 11,
          ],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#FCFBF7',
        },
      });

      // District-level aggregation source & layers (available when Coarse mode is toggled)
      map.addSource('district-aggregate', { type: 'geojson', data: buildDistrictAggregates() as any });
      map.addLayer({
        id: 'district-aggregate-circle',
        type: 'circle',
        source: 'district-aggregate',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'zone_count'], 1, 22, 5, 40],
          'circle-color': [
            'match',
            ['get', 'risk_level'],
            'CRITICAL', RISK_LEVEL_HEX.CRITICAL,
            'HIGH', RISK_LEVEL_HEX.HIGH,
            'MODERATE', RISK_LEVEL_HEX.MODERATE,
            'LOW', RISK_LEVEL_HEX.LOW,
            'VERY_LOW', RISK_LEVEL_HEX.VERY_LOW,
            '#8A8F88',
          ],
          'circle-opacity': 0.85,
          'circle-stroke-color': '#FCFBF7',
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: 'district-aggregate-label',
        type: 'symbol',
        source: 'district-aggregate',
        layout: {
          'text-field': ['concat', ['get', 'district'], '\n', ['to-string', ['get', 'avg_risk_score']]],
          'text-size': 11,
          'text-line-height': 1.2,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': '#FCFBF7', 'text-halo-color': 'rgba(0,0,0,0.3)', 'text-halo-width': 1 },
      });

      // Popover for zone marker hover
      const zonePopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
        className: 'custom-map-popup',
      });

      map.on('mousemove', 'risk-points-circle', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const p = e.features?.[0]?.properties as Record<string, any> | undefined;
        if (!p || !e.lngLat) return;
        const level = (p.risk_level || 'UNKNOWN').replace('_', ' ');
        const score = Math.round(Number(p.risk_score) || 0);
        const score01 = (score / 100).toFixed(2);
        const color = RISK_LEVEL_HEX[p.risk_level as keyof typeof RISK_LEVEL_HEX] || '#8A8F88';

        zonePopup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family: var(--font-mono, monospace); font-size: 11px; line-height: 1.45; min-width: 170px;">` +
              `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">` +
                `<strong style="font-size: 12px; color: #1B211D;">${p.cell_id}</strong>` +
                `<span style="background: ${color}; color: #FCFBF7; font-weight: 700; padding: 2px 6px; font-size: 9.5px; letter-spacing: 0.05em;">${level}</span>` +
              `</div>` +
              `<div style="color: #6E756E; font-family: var(--font-sans, sans-serif); font-size: 11px; margin-bottom: 6px;">${p.district || 'District'} · ${p.state || 'NER'}</div>` +
              `<div style="display: flex; justify-content: space-between; border-top: 1px solid #E4E1D8; padding-top: 5px;">` +
                `<span style="color: #6E756E;">Risk Score:</span>` +
                `<strong style="color: #1B211D;">${score} <span style="color: #8A8F88; font-weight: normal;">(${score01})</span></strong>` +
              `</div>` +
              `<div style="display: flex; justify-content: space-between; margin-top: 2px;">` +
                `<span style="color: #6E756E;">Trend (6h):</span>` +
                `<span style="color: #1B211D;">${p.trend === 'INCREASING' ? '▲ Rising' : p.trend === 'DECREASING' ? '▼ Falling' : '■ Steady'}</span>` +
              `</div>` +
            `</div>`,
          )
          .addTo(map);
      });

      map.on('mouseleave', 'risk-points-circle', () => {
        map.getCanvas().style.cursor = '';
        zonePopup.remove();
      });

      // Click on unclustered risk point marker
      map.on('click', 'risk-points-circle', (e) => {
        const cellId = e.features?.[0]?.properties?.cell_id;
        if (cellId) {
          selectZone(cellId);
        }
      });

      // Click on cluster expands/zooms in
      map.on('click', 'risk-clusters', async (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['risk-clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId == null) return;

        const source = map.getSource('risk-grid-points') as maplibregl.GeoJSONSource;
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          if (zoom != null) {
            map.easeTo({
              center: (features[0].geometry as Point).coordinates as [number, number],
              zoom: zoom + 0.5,
              duration: 600,
            });
          }
        } catch {
          // ignore if cluster resolution fails
        }
      });

      map.on('mouseenter', 'risk-clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'risk-clusters', () => {
        map.getCanvas().style.cursor = '';
      });

      // District aggregate popup & click
      const aggregatePopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 });
      map.on('mousemove', 'district-aggregate-circle', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const p = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        if (!p || !e.lngLat) return;
        aggregatePopup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family: var(--font-mono, monospace); font-size: 11px; line-height: 1.5;">` +
              `<strong>${p.district}</strong>, ${p.state}<br/>` +
              `Avg. risk score: ${p.avg_risk_score} (${p.risk_level})<br/>` +
              `${p.zone_count} monitored zone(s)` +
            `</div>`,
          )
          .addTo(map);
      });
      map.on('mouseleave', 'district-aggregate-circle', () => {
        map.getCanvas().style.cursor = '';
        aggregatePopup.remove();
      });
      map.on('click', 'district-aggregate-circle', (e) => {
        const cellId = e.features?.[0]?.properties?.top_cell_id;
        if (cellId) selectZone(cellId);
      });

      applyRiskLayerVisibility(map, activeMapLayer, Boolean(coarse));

      // Citizen reports layer
      map.addSource('citizen-reports', { type: 'geojson', data: reportsToGeoJson([]) as any });
      map.addLayer({
        id: 'citizen-reports-points',
        type: 'circle',
        source: 'citizen-reports',
        paint: {
          'circle-radius': 5.5,
          'circle-color': [
            'match',
            ['get', 'status'],
            'VERIFIED', '#3E8E5B',
            'REJECTED', '#B9A9A5',
            'PROBABLE', '#D9A526',
            '#FCFBF7',
          ],
          'circle-stroke-color': '#1B211D',
          'circle-stroke-width': 1.6,
        },
      });

      // Real GSI landslide inventory (820 events)
      map.addSource('landslide-inventory', { type: 'geojson', data: '/data/landslide_heatmap.geojson' });
      map.addLayer({
        id: 'landslide-heat',
        type: 'heatmap',
        source: 'landslide-inventory',
        layout: { visibility: activeMapLayer === 'INVENTORY' ? 'visible' : 'none' },
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'sim_intensity'], 0, 0, 1, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.6, 9, 2.2],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 8, 9, 26],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.9, 10, 0.35],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(46,125,91,0)',
            0.2, RISK_LEVEL_HEX.VERY_LOW,
            0.4, RISK_LEVEL_HEX.LOW,
            0.6, RISK_LEVEL_HEX.MODERATE,
            0.8, RISK_LEVEL_HEX.HIGH,
            1, RISK_LEVEL_HEX.CRITICAL,
          ],
        },
      });
      map.addLayer({
        id: 'landslide-points',
        type: 'circle',
        source: 'landslide-inventory',
        layout: { visibility: activeMapLayer === 'INVENTORY' ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 12, 6.5],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'sim_intensity'],
            0.15, RISK_LEVEL_HEX.VERY_LOW,
            0.4, RISK_LEVEL_HEX.MODERATE,
            0.7, RISK_LEVEL_HEX.HIGH,
            1, RISK_LEVEL_HEX.CRITICAL,
          ],
          'circle-stroke-color': '#FCFBF7',
          'circle-stroke-width': 1,
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 8, 1],
        },
      });

      const inventoryPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
      map.on('mousemove', 'landslide-points', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (!f || !e.lngLat) return;
        const p = f.properties as Record<string, unknown>;
        inventoryPopup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family: var(--font-mono, monospace); font-size: 11px; line-height: 1.5;">` +
              `<strong>${p.landslide_id}</strong> · ${p.source}<br/>` +
              `${p.district}, ${p.state}<br/>` +
              `Type: ${p.landslide_type ?? 'unrecorded'}<br/>` +
              `Sim. intensity: ${p.sim_intensity} <span style="color:#8A8F88">(simulated)</span>` +
              `</div>`,
          )
          .addTo(map);
      });
      map.on('mouseleave', 'landslide-points', () => {
        map.getCanvas().style.cursor = '';
        inventoryPopup.remove();
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

  // Outline and highlight the selected zone
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('risk-grid-outline')) {
      map.setPaintProperty('risk-grid-outline', 'line-width', [
        'case',
        ['==', ['get', 'cell_id'], selectedCellId ?? ''],
        3,
        1,
      ]);
      map.setPaintProperty('risk-grid-outline', 'line-color', [
        'case',
        ['==', ['get', 'cell_id'], selectedCellId ?? ''],
        '#1B211D',
        '#3E463F',
      ]);
      map.setPaintProperty('risk-grid-outline', 'line-opacity', [
        'case',
        ['==', ['get', 'cell_id'], selectedCellId ?? ''],
        0.95,
        0.35,
      ]);
    }

    if (map.getLayer('risk-points-circle')) {
      map.setPaintProperty('risk-points-circle', 'circle-stroke-width', [
        'case',
        ['==', ['get', 'cell_id'], selectedCellId ?? ''],
        3.5,
        2,
      ]);
      map.setPaintProperty('risk-points-circle', 'circle-stroke-color', [
        'case',
        ['==', ['get', 'cell_id'], selectedCellId ?? ''],
        '#1B211D',
        '#FCFBF7',
      ]);
    }
  }, [selectedCellId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.resize();
  }, [height]);

  // Keep the risk-grid, risk-grid-points, and district-aggregate sources in sync with real-time risk predictions
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !riskGridData) return;
    const gridSource = map.getSource('risk-grid') as maplibregl.GeoJSONSource | undefined;
    if (gridSource) {
      gridSource.setData(riskGridData as any);
    }
    const pointsSource = map.getSource('risk-grid-points') as maplibregl.GeoJSONSource | undefined;
    if (pointsSource) {
      pointsSource.setData(gridToCentroidPoints(riskGridData as any) as any);
    }
    const distSource = map.getSource('district-aggregate') as maplibregl.GeoJSONSource | undefined;
    if (distSource) {
      distSource.setData(buildDistrictAggregates((riskGridData?.features as any) || (RISK_GRID.features as any)) as any);
    }
  }, [riskGridData]);

  // Keep citizen-report markers in sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('citizen-reports') || !reports) return;
    (map.getSource('citizen-reports') as maplibregl.GeoJSONSource).setData(reportsToGeoJson(reports) as any);
  }, [reports]);

  // Toggle layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    applyRiskLayerVisibility(map, activeMapLayer, Boolean(coarse));
  }, [activeMapLayer, coarse]);

  // Fly/Jump map to selected zone or state
  useEffect(() => {
    if (isFirstJump.current) {
      isFirstJump.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map) return;

    const allFeatures = (riskGridData?.features as any[]) || RISK_GRID.features;
    const feature = allFeatures.find((f) => f.properties?.cell_id === selectedCellId);
    if (feature && feature.geometry?.coordinates?.[0]) {
      const ring = feature.geometry.coordinates[0];
      const lons = ring.map((c: number[]) => c[0]);
      const lats = ring.map((c: number[]) => c[1]);
      const margin = 0.35;
      map.fitBounds(
        [
          [Math.min(...lons) - margin, Math.min(...lats) - margin],
          [Math.max(...lons) + margin, Math.max(...lats) + margin],
        ],
        { duration: 800, maxZoom: 10 },
      );
      return;
    }

    const bounds = selectedState === 'All States' ? NER_BOUNDS : STATE_BOUNDS[selectedState];
    if (bounds) map.fitBounds(bounds, { padding: 32, duration: 800 });
  }, [selectedCellId, selectedState, riskGridData]);

  return <div ref={containerRef} style={{ width: '100%', height, background: coarse ? '#EEEBE3' : '#EAE7DF' }} />;
});

export default RiskMap;
