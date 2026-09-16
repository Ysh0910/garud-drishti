interface PanelStatusProps {
  kind: 'loading' | 'error' | 'empty';
  message?: string;
}

const DEFAULTS: Record<PanelStatusProps['kind'], string> = {
  loading: 'Loading…',
  error: 'Unable to load this panel — retrying automatically. The rest of the console still works.',
  empty: 'No data available.',
};

/** Consistent, honest fallback for a panel's async state — never leaves a panel blank or spinning forever. */
export default function PanelStatus({ kind, message }: PanelStatusProps) {
  return (
    <div
      style={{
        padding: '28px 18px',
        font: "400 12px/1.5 var(--font-sans)",
        color: kind === 'error' ? 'var(--warn-text)' : 'var(--ink-faint)',
      }}
    >
      {message ?? DEFAULTS[kind]}
    </div>
  );
}
