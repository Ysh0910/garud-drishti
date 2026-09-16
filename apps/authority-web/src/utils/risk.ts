import type { RiskLevel, Trend } from '../types/enums';

export function formatScore01(riskScore0to100: number): string {
  return (riskScore0to100 / 100).toFixed(2);
}

export function riskBadgeClass(level: RiskLevel): string {
  return `badge badge-${level.toLowerCase()}`;
}

export const RISK_LEVEL_HEX: Record<RiskLevel, string> = {
  CRITICAL: '#8E2420',
  HIGH: '#C9631B',
  MODERATE: '#E3A130',
  LOW: '#7D9C3C',
  VERY_LOW: '#2E7D5B',
};

export function trendGlyph(trend: Trend): { glyph: string; color: string } {
  if (trend === 'INCREASING') return { glyph: '▲', color: 'var(--risk-critical)' };
  if (trend === 'DECREASING') return { glyph: '▼', color: 'var(--risk-very-low)' };
  return { glyph: '▬', color: 'var(--ink-muted)' };
}

export function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '' : ' ';
  return `${sign}${delta.toFixed(2)}`;
}
