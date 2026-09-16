/**
 * scripts/rehearse_demo.ts
 * ------------------------
 * Automated Live Demo Rehearsal & Verification Script for GARUD DRISHTI.
 * Simulates the full 30-second Judge / Disaster Management Authority Journey:
 *
 * 1. SENSE: System Health & Readiness Verification
 * 2. VISUALISE: Regional Risk Surface Query (MapLibre GeoJSON Grid)
 * 3. ANALYSE: Selected High-Risk Zone Detail & SHAP Feature Explanations
 * 4. EXPOSURE: Infrastructure & Population Proximity Intersections
 * 5. EVIDENCE: Citizen Hazard Report Ingestion with Photo Attachment
 * 6. REVIEW: Authority Incident Verification Workflow
 * 7. PRIORITISE: Multi-Factor Response Prioritization Engine
 * 8. WARN & RESPOND: Stateful Alert Lifecycle & Dashboard KPI Dynamic Summary
 */

import crypto from 'crypto';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

interface RehearsalResult {
  step: string;
  passed: boolean;
  durationMs: number;
  details: any;
}

const results: RehearsalResult[] = [];

async function step(name: string, fn: () => Promise<any>): Promise<void> {
  const start = Date.now();
  process.stdout.write(`⏳ [REHEARSAL] ${name}... `);
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    results.push({ step: name, passed: true, durationMs, details });
    console.log(`✅ PASSED (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ step: name, passed: false, durationMs, details: err.message });
    console.log(`❌ FAILED (${durationMs}ms): ${err.message}`);
    throw err;
  }
}

async function requestJson(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

async function runDemoRehearsal() {
  console.log('================================================================');
  console.log('🦅 GARUD DRISHTI — LIVE DEMO REHEARSAL & HARDENING SUITE');
  console.log(`🎯 Target API Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  // STEP 1: Health & Readiness Check
  await step('1. Verify Gateway Health & PostGIS / ML Subsystem Readiness', async () => {
    const health = await requestJson('/health/ready');
    if (health.status !== 'ready') throw new Error(`Gateway not ready: ${JSON.stringify(health)}`);
    return { status: health.status, checks: health.checks };
  });

  // STEP 2: Regional Risk Surface Query (MapLibre GeoJSON Grid)
  let cellId = 'CELL_NER_001';
  await step('2. Query Regional Risk Grid Heatmap FeatureCollection', async () => {
    const grid = await requestJson('/api/v1/risk/grid?bbox=87.5,21.5,97.5,29.5');
    if (!grid.features || grid.features.length === 0) throw new Error('Risk grid returned no features');
    const firstFeature = grid.features[0];
    cellId = firstFeature.properties.cell_id;
    return {
      total_cells: grid.features.length,
      sample_cell: cellId,
      sample_risk: firstFeature.properties.risk_score,
      risk_level: firstFeature.properties.risk_level,
    };
  });

  // STEP 3: Zone Details & SHAP Drivers
  await step(`3. Retrieve Zone Details & SHAP Explainability for ${cellId}`, async () => {
    const zone = await requestJson(`/api/v1/risk/${cellId}`);
    const explain = await requestJson(`/api/v1/risk/${cellId}/explain`);
    if (!zone.cell_id) throw new Error('Invalid zone detail response');
    if (!explain.explanation || !explain.explanation.top_factors) throw new Error('Missing SHAP factors');
    return {
      cell_id: zone.cell_id,
      risk_score: zone.current_risk,
      top_shap_factor: explain.explanation.top_factors[0],
      forecast_count: zone.forecasts.length,
    };
  });

  // STEP 4: Exposure & Infrastructure Intersections
  await step('4. Query Nearby Infrastructure & Population Exposure', async () => {
    const assets = await requestJson('/api/v1/assets/nearby?latitude=27.33&longitude=88.61&radius_m=10000');
    const roads = await requestJson('/api/v1/roads/risk?min_risk=40');
    return {
      nearby_assets_count: assets.assets ? assets.assets.length : 0,
      monitored_roads_count: roads.roads ? roads.roads.length : 0,
    };
  });

  // STEP 5: Citizen Hazard Reporting with Photo Attachment
  let createdReportId = '';
  await step('5. Ingest Citizen Hazard Observation (GPS + Photo Evidence)', async () => {
    const payload = {
      client_report_id: crypto.randomUUID(),
      category: 'ROCKFALL',
      description: 'Active rockfall and debris accumulation on NH-10 corridor.',
      latitude: 27.332,
      longitude: 88.614,
      location_accuracy_m: 5.0,
      captured_at: new Date().toISOString(),
      severity: 'HIGH',
      media_url: '/uploads/sample_rockfall.jpg',
    };
    const res = await requestJson('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.report_id) throw new Error('Report creation failed');
    createdReportId = res.report_id;
    return {
      report_id: res.report_id,
      status: res.status,
      media_url: res.media_url,
    };
  });

  // STEP 6: Authority Incident Verification Workflow
  await step(`6. Execute Authority Incident Verification for Report ${createdReportId}`, async () => {
    const verifyRes = await requestJson(`/api/v1/reports/${createdReportId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ action: 'VERIFY' }),
    });
    if (verifyRes.status !== 'VERIFIED') throw new Error(`Expected VERIFIED, got ${verifyRes.status}`);
    return {
      report_id: verifyRes.report_id,
      status: verifyRes.status,
      verified_by: verifyRes.verified_by,
    };
  });

  // STEP 7: Response Prioritization Engine Evaluation
  await step('7. Evaluate Multi-Factor Response Priority Ranking', async () => {
    const priorityInput = {
      hazard_score: 88,
      trend: 'INCREASING',
      population: 1250,
      nearby_villages_count: 2,
      has_national_highway: true,
      has_state_highway: true,
      critical_facilities_count: 1,
      has_hospital: true,
      has_school_or_shelter: true,
      has_power_or_comm: true,
    };
    const evalRes = await requestJson('/api/v1/prioritization/evaluate', {
      method: 'POST',
      body: JSON.stringify(priorityInput),
    });
    const priorityData = evalRes.data || evalRes;
    if (!priorityData.response_priority) throw new Error('Prioritization evaluation failed');
    return {
      priority_score: priorityData.priority_score,
      response_priority: priorityData.response_priority,
      reasons: priorityData.reasons,
    };
  });

  // STEP 8: Stateful Alert Workflow (Create -> Acknowledge -> Summary KPIs -> Resolve)
  await step('8. Complete Stateful Alert Lifecycle & Verify Live Dashboard KPIs', async () => {
    const alertId = crypto.randomUUID();
    const createAlertRes = await requestJson('/api/v1/alerts', {
      method: 'POST',
      body: JSON.stringify({
        alert_id: alertId,
        cell_id: cellId,
        zone_name: 'Gangtok Corridor (NH-10)',
        severity: 'CRITICAL',
        trigger_reason: 'Monsoon precipitation threshold exceeded combined with critical slope instability.',
        trigger_rule: 'RULE_CRITICAL_ACCUMULATION',
        risk_score: 88,
      }),
    });

    const ackAlertRes = await requestJson(`/api/v1/alerts/${createAlertRes.alert_id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: 'R. Baruah (MSDMA Director)' }),
    });

    const summaryRes = await requestJson('/api/v1/dashboard/summary');

    const resolveAlertRes = await requestJson(`/api/v1/alerts/${createAlertRes.alert_id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_reason: 'Slope stabilization completed and rain abated.' }),
    });

    return {
      alert_id: createAlertRes.alert_id,
      acknowledged_state: ackAlertRes.state,
      approved_by: ackAlertRes.approved_by,
      active_alerts_kpi: summaryRes.kpi.active_alerts,
      resolved_state: resolveAlertRes.state,
    };
  });

  console.log('\n================================================================');
  console.log('🎉 DEMO REHEARSAL SUCCESSFUL — ALL 8 CORE JOURNEYS VALIDATED');
  console.log('================================================================');
  console.table(results.map((r) => ({ Step: r.step, Passed: r.passed ? '✅' : '❌', 'Time (ms)': r.durationMs })));
}

runDemoRehearsal().catch(() => {
  console.error('\n❌ DEMO REHEARSAL FAILED — Review errors above.');
  process.exit(1);
});
