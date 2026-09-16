import { KPI_CARDS } from '../../mocks/dashboard';

export default function KpiRow() {
  return (
    <div className="grid-divider" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
      {KPI_CARDS.map((card) => (
        <div
          key={card.key}
          style={{
            background: 'var(--panel-bg)',
            padding: '14px 18px 13px',
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
            borderTop: `3px solid ${card.accent}`,
          }}
        >
          <div className="eyebrow">{card.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="mono tabular" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1, color: 'var(--ink)' }}>
              {card.value}
            </span>
            {card.delta && (
              <span className="mono" style={{ fontSize: 11, fontWeight: 500, color: card.deltaColor }}>
                {card.delta}
              </span>
            )}
          </div>
          <div style={{ font: "400 11.5px/1 var(--font-sans)", color: 'var(--ink-faint)' }}>{card.sublabel}</div>
        </div>
      ))}
    </div>
  );
}
