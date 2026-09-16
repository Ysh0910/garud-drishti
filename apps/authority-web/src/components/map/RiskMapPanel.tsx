import { useRef } from 'react';
import { RISK_BAND_RANGE } from '../../types/enums';
import { SCRUB_STEPS, useDashboardStore, type MapLayer, type ScrubKey } from '../../store/dashboardStore';
import RiskMap, { type RiskMapHandle } from './RiskMap';
import RainfallChart from '../charts/RainfallChart';

const SCRUB_LABEL: Record<ScrubKey, string> = {
  '-24h': '−24h',
  '-12h': '−12h',
  now: 'Now',
  '+6h': '+6h',
  '+24h': '+24h',
  '+48h': '+48h',
  '+72h': '+72h',
};

const RISK_BAND_ORDER: Array<{ key: keyof typeof RISK_BAND_RANGE; token: string }> = [
  { key: 'CRITICAL', token: 'var(--risk-critical)' },
  { key: 'HIGH', token: 'var(--risk-high)' },
  { key: 'MODERATE', token: 'var(--risk-moderate)' },
  { key: 'LOW', token: 'var(--risk-low)' },
  { key: 'VERY_LOW', token: 'var(--risk-very-low)' },
];

const LAYERS: MapLayer[] = ['RISK', 'INVENTORY', 'RAINFALL', 'SLOPE', 'ROADS'];
const ENABLED_LAYERS = new Set<MapLayer>(['RISK', 'INVENTORY']);

function bannerFor(scrub: ScrubKey) {
  const idx = SCRUB_STEPS.indexOf(scrub);
  if (idx <= 2) {
    return idx === 2
      ? { validated: true, text: 'Now · validated nowcast — observed rainfall and sensor feeds through 14:32 IST.' }
      : { validated: true, text: `${SCRUB_LABEL[scrub]} · replay of the archived run for this time step.` };
  }
  if (idx === 3) {
    return { validated: true, text: '+6h · validated forecast — skill verified against 2019–2025 hindcast.' };
  }
  return {
    validated: false,
    text: `${SCRUB_LABEL[scrub]} · unvalidated extrapolation. Cells shown dashed and muted; not a basis for issuing alerts.`,
  };
}

export default function RiskMapPanel() {
  const mapRef = useRef<RiskMapHandle>(null);
  const { scrub, setScrub, coarse, toggleCoarse, confidenceTexture, toggleTexture, activeMapLayer, setMapLayer } =
    useDashboardStore();

  const banner = bannerFor(scrub);
  const handleLeft = `${(100 / 7) * SCRUB_STEPS.indexOf(scrub) + 100 / 14}%`;
  const gridNote = coarse ? 'District aggregate · 12 corridors' : '8 km grid · 12 corridors';

  return (
    <div className="panel">
      <div className="panel-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div className="panel-title">REGIONAL RISK SURFACE</div>
          <div className="panel-subtle">
            Model v2.4 · {gridNote} · showing {SCRUB_LABEL[scrub]}
          </div>
        </div>
        <div className="seg">
          <button
            onClick={toggleCoarse}
            style={{ background: coarse ? 'var(--header-bg)' : 'var(--panel-bg)', color: coarse ? 'var(--header-ink)' : 'var(--ink-soft)' }}
          >
            DISTRICT AGGREGATE
          </button>
          <button
            onClick={toggleTexture}
            style={{
              background: confidenceTexture ? 'var(--header-bg)' : 'var(--panel-bg)',
              color: confidenceTexture ? 'var(--header-ink)' : 'var(--ink-soft)',
            }}
          >
            CONFIDENCE TEXTURE
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 18px',
          background: banner.validated ? '#F1F4F0' : 'var(--warn-bg)',
          borderBottom: '1px solid var(--hairline-soft)',
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: `9px solid ${banner.validated ? '#3E5147' : 'var(--warn-text)'}`,
          }}
        />
        <div style={{ font: "500 11.5px/1.3 var(--font-sans)", color: banner.validated ? '#3E5147' : 'var(--warn-text)' }}>
          {banner.text}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <RiskMap ref={mapRef} height={474} coarse={coarse} />

        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 16,
            background: 'rgba(252,251,247,.96)',
            border: '1px solid var(--border-strong)',
            padding: '12px 14px 11px',
            minWidth: 232,
            whiteSpace: 'nowrap',
          }}
        >
          {activeMapLayer === 'INVENTORY' ? (
            <>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--ink-muted)', marginBottom: 9 }}>
                LANDSLIDE INVENTORY
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 16, height: 11, background: 'linear-gradient(90deg, var(--risk-very-low), var(--risk-moderate), var(--risk-critical))' }} />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                    Density / sim. intensity
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)', lineHeight: 1.4, whiteSpace: 'normal', maxWidth: 220 }}>
                  820 GSI-recorded events. Heat weight is a SIMULATED heuristic
                  (slope + type) — the source data has no measured severity
                  field.
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--ink-muted)', marginBottom: 9 }}>
                RISK BAND
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {RISK_BAND_ORDER.map((b) => (
                  <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 16, height: 11, background: b.token }} />
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>
                      {b.key.replace('_', ' ')}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 'auto' }}>
                      {RISK_BAND_RANGE[b.key]}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          {activeMapLayer !== 'INVENTORY' && confidenceTexture && (
            <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--hairline-soft)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--ink-muted)' }}>
                CONFIDENCE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 16, height: 11, background: 'var(--risk-critical)' }} />
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  SOLID · HIGH
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div
                  style={{
                    width: 16,
                    height: 11,
                    background: 'repeating-linear-gradient(45deg, var(--risk-critical) 0 3px, #FBFAF6 3px 7px)',
                  }}
                />
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  HATCHED · LOW
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 16, height: 11, border: '1px dashed var(--ink-faint)', background: 'var(--hairline-softer)' }} />
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  DASHED · UNVALIDATED
                </span>
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'absolute', right: 16, top: 16, display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-strong)', border: '1px solid var(--border-strong)' }}>
          <button className="mono" onClick={() => mapRef.current?.zoomIn()} style={{ background: 'var(--panel-bg)', border: 'none', width: 30, height: 30, fontSize: 15, color: 'var(--ink)', cursor: 'pointer' }}>
            +
          </button>
          <button className="mono" onClick={() => mapRef.current?.zoomOut()} style={{ background: 'var(--panel-bg)', border: 'none', width: 30, height: 30, fontSize: 15, color: 'var(--ink)', cursor: 'pointer' }}>
            −
          </button>
          <button className="mono" onClick={() => mapRef.current?.resetNorth()} style={{ background: 'var(--panel-bg)', border: 'none', width: 30, height: 30, fontSize: 9, color: 'var(--ink)', cursor: 'pointer' }}>
            N
          </button>
        </div>

        <div style={{ position: 'absolute', right: 16, bottom: 44, display: 'flex', gap: 1, background: 'var(--border-strong)', border: '1px solid var(--border-strong)' }}>
          {LAYERS.map((layer) => {
            const enabled = ENABLED_LAYERS.has(layer);
            return (
              <button
                key={layer}
                className="mono"
                disabled={!enabled}
                onClick={() => setMapLayer(layer)}
                title={enabled ? undefined : 'No mock data available for this layer yet'}
                style={{
                  background: activeMapLayer === layer ? 'var(--header-bg-alt)' : 'var(--panel-bg)',
                  color: activeMapLayer === layer ? 'var(--header-ink)' : 'var(--ink-soft)',
                  border: 'none',
                  padding: '7px 12px',
                  fontSize: 11.5,
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  opacity: enabled ? 1 : 0.55,
                }}
              >
                {layer}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '12px 18px 14px', borderTop: '1px solid var(--hairline-soft)', borderBottom: '1px solid var(--hairline-soft)', background: 'var(--panel-bg-alt)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
          <div className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', color: 'var(--ink-soft)' }}>
            TIMELINE
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            DRAG OR CLICK A STEP · ARCHIVED REPLAY LEFT OF NOW
          </div>
        </div>
        <div style={{ position: 'relative', height: 8, display: 'flex', margin: '0 0 4px' }}>
          <div style={{ flex: 3, background: '#C4CCC5' }} />
          <div style={{ flex: 1, background: '#A9B8AD' }} />
          <div style={{ flex: 3, background: 'repeating-linear-gradient(90deg, #D8D3C4 0 5px, #EDE9DC 5px 10px)' }} />
          <div
            style={{
              position: 'absolute',
              top: -5,
              left: handleLeft,
              width: 3,
              height: 18,
              background: 'var(--header-bg)',
              transform: 'translateX(-1.5px)',
            }}
          />
        </div>
        <div style={{ display: 'flex' }}>
          {SCRUB_STEPS.map((step, i) => (
            <button
              key={step}
              onClick={() => setScrub(step)}
              className="mono"
              style={{
                flex: 1,
                border: 'none',
                borderRight: i < SCRUB_STEPS.length - 1 ? '1px solid #E0DCD0' : 'none',
                padding: '7px 0',
                fontSize: 11.5,
                fontWeight: step === 'now' ? 600 : 500,
                cursor: 'pointer',
                background: scrub === step ? 'var(--header-bg)' : 'transparent',
                color: scrub === step ? 'var(--header-ink)' : 'var(--ink-soft)',
              }}
            >
              {SCRUB_LABEL[step]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '13px 18px 15px' }}>
        <RainfallChart height={104} />
      </div>
    </div>
  );
}
