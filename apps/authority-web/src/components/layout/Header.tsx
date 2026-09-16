import { Link } from 'react-router-dom';

interface HeaderProps {
  runLabel: string;
  updatedLabel: string;
}

export default function Header({ runLabel, updatedLabel }: HeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        background: 'var(--header-bg)',
        color: 'var(--header-ink)',
        padding: '0 22px',
        height: 66,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 30,
            height: 30,
            border: '1.5px solid var(--header-ink-dim)',
            transform: 'rotate(45deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <div style={{ width: 10, height: 10, background: 'var(--header-ink-dim)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link
            to="/"
            style={{
              font: "700 17px/1 var(--font-sans)",
              letterSpacing: '0.14em',
              color: 'var(--header-ink)',
              textDecoration: 'none',
            }}
          >
            GARUD DRISHTI
          </Link>
          <div style={{ font: "400 11.5px/1 var(--font-mono)", letterSpacing: '0.1em', color: 'var(--header-ink-dim)' }}>
            LANDSLIDE EARLY WARNING · NORTH EASTERN REGION
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            padding: '0 14px',
            borderLeft: '1px solid rgba(157,179,166,.3)',
          }}
        >
          <div style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: '0.12em', color: 'var(--header-ink-dimmer)' }}>
            STATE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: "500 13px/1 var(--font-sans)" }}>
            Meghalaya <span style={{ fontSize: 9, color: 'var(--header-ink-dim)' }}>▼</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            padding: '0 14px',
            borderLeft: '1px solid rgba(157,179,166,.3)',
          }}
        >
          <div style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: '0.12em', color: 'var(--header-ink-dimmer)' }}>
            DISTRICT
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: "500 13px/1 var(--font-sans)" }}>
            All districts (11) <span style={{ fontSize: 9, color: 'var(--header-ink-dim)' }}>▼</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 12px',
            marginLeft: 4,
            background: 'var(--header-bg-alt)',
            border: '1px solid rgba(157,179,166,.28)',
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--good)', flex: 'none' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ font: "500 11px/1 var(--font-mono)" }}>{updatedLabel}</div>
            <div style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: '0.08em', color: 'var(--header-ink-dimmer)' }}>
              {runLabel}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 12px',
            background: 'var(--header-bg-deep)',
            border: '1px solid rgba(157,179,166,.28)',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              background: 'var(--header-ink-dim)',
              color: 'var(--header-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              font: "600 11px/1 var(--font-mono)",
              flex: 'none',
            }}
          >
            RB
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ font: "500 11.5px/1 var(--font-sans)" }}>R. Baruah</div>
            <div style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: '0.08em', color: 'var(--header-ink-dim)' }}>
              MSDMA · APPROVER
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
