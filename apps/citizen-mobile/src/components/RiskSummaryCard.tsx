/**
 * Tactical Risk Spectrum & Telemetry Card
 * Displays multi-band hazard spectrum, live precursor readings, and official advisories.
 * Memoized for instant render performance.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, getRiskColor, SPACING, RADIUS } from '../constants/theme';
import { RiskPointResponse } from '../types/risk';

interface RiskSummaryCardProps {
  riskData: RiskPointResponse | null;
  onPressDetails?: () => void;
}

const RiskSummaryCardComponent: React.FC<RiskSummaryCardProps> = ({
  riskData,
  onPressDetails,
}) => {
  if (!riskData) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <Text style={styles.loadingText}>Synthesizing slope telemetry...</Text>
      </View>
    );
  }

  const levelColor = getRiskColor(riskData.risk_level);
  const forecast24h = riskData.forecasts.find((f) => f.horizon === '24h');

  // Spectrum band markers
  const BANDS = [
    { label: 'VERY LOW', min: 0, max: 20, color: '#10B981', active: riskData.current_risk <= 20 },
    { label: 'LOW', min: 21, max: 40, color: '#059669', active: riskData.current_risk > 20 && riskData.current_risk <= 40 },
    { label: 'MODERATE', min: 41, max: 60, color: '#D97706', active: riskData.current_risk > 40 && riskData.current_risk <= 60 },
    { label: 'HIGH', min: 61, max: 80, color: '#EA580C', active: riskData.current_risk > 60 && riskData.current_risk <= 80 },
    { label: 'CRITICAL', min: 81, max: 100, color: '#DC2626', active: riskData.current_risk > 80 },
  ];

  return (
    <View style={styles.card}>
      {/* Card Header with Sector Metadata */}
      <View style={styles.cardTopRow}>
        <View>
          <Text style={styles.sectorLabel}>SECTOR HAZARD INDEX • NER-0042</Text>
          <Text style={styles.locationTitle}>East Khasi Hills Basin</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${levelColor}1A`, borderColor: levelColor }]}>
          <View style={[styles.badgeDot, { backgroundColor: levelColor }]} />
          <Text style={[styles.statusBadgeText, { color: levelColor }]}>
            {riskData.risk_level}
          </Text>
        </View>
      </View>

      {/* Main Score Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.primaryMetric}>
          <Text style={styles.metricCaption}>CURRENT ESTIMATED RISK</Text>
          <View style={styles.scoreNumberRow}>
            <Text style={[styles.scoreNumber, { color: levelColor }]}>{riskData.current_risk}</Text>
            <Text style={styles.scoreUnit}>/100</Text>
          </View>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.secondaryMetric}>
          <Text style={styles.metricCaption}>24-HOUR OUTLOOK</Text>
          <View style={styles.forecastNumberRow}>
            <Text style={styles.forecastNumber}>
              {forecast24h ? forecast24h.risk_score : '--'}
            </Text>
            <Text style={styles.forecastUnit}>/100</Text>
          </View>
          {forecast24h && (
            <Text style={[styles.forecastLevelTag, { color: getRiskColor(forecast24h.risk_level) }]}>
              {forecast24h.risk_level} RISK
            </Text>
          )}
        </View>
      </View>

      {/* Segmented Hazard Spectrum Meter */}
      <View style={styles.spectrumTrack}>
        {BANDS.map((band) => (
          <View
            key={band.label}
            style={[
              styles.spectrumSegment,
              { backgroundColor: band.color },
              band.active ? styles.spectrumSegmentActive : styles.spectrumSegmentDim,
            ]}
          />
        ))}
      </View>
      <View style={styles.spectrumLabels}>
        <Text style={styles.spectrumMin}>0 (STABLE)</Text>
        <Text style={styles.spectrumMid}>BAND: {riskData.risk_level}</Text>
        <Text style={styles.spectrumMax}>100 (CRITICAL)</Text>
      </View>

      {/* Environmental Telemetry Drivers */}
      <View style={styles.telemetryBox}>
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryKey}>Rainfall (72h)</Text>
          <Text style={styles.telemetryVal}>186 mm</Text>
        </View>
        <View style={styles.telemetrySeparator} />
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryKey}>Soil Saturation</Text>
          <Text style={styles.telemetryVal}>84%</Text>
        </View>
        <View style={styles.telemetrySeparator} />
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryKey}>Terrain Slope</Text>
          <Text style={styles.telemetryVal}>38° Avg</Text>
        </View>
      </View>

      {/* Operational Protocol Advisory */}
      <View style={styles.advisoryNotice}>
        <Text style={styles.advisoryTitle}>OPERATIONAL ADVISORY</Text>
        <Text style={styles.advisoryBody}>
          Active debris flow potential elevated on highway cuttings. Field responders should report any newly formed tension cracks or slope toe seepage.
        </Text>
      </View>

      {onPressDetails && (
        <TouchableOpacity
          style={styles.actionLink}
          onPress={onPressDetails}
          activeOpacity={0.7}
        >
          <Text style={styles.actionLinkText}>View Geological Forecast Horizons →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

RiskSummaryCardComponent.displayName = 'RiskSummaryCard';
export const RiskSummaryCard = memo(RiskSummaryCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  loadingCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  sectorLabel: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  primaryMetric: {
    flex: 1.2,
  },
  secondaryMetric: {
    flex: 1,
    paddingLeft: SPACING.md,
  },
  metricDivider: {
    width: 1,
    height: 44,
    backgroundColor: COLORS.border,
  },
  metricCaption: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  scoreNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  scoreNumber: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  scoreUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginLeft: 3,
  },
  forecastNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  forecastNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  forecastUnit: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  forecastLevelTag: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },
  spectrumTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: SPACING.md,
    gap: 3,
  },
  spectrumSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  spectrumSegmentActive: {
    opacity: 1,
    transform: [{ scaleY: 1.3 }],
  },
  spectrumSegmentDim: {
    opacity: 0.2,
  },
  spectrumLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  spectrumMin: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: COLORS.textMuted,
  },
  spectrumMid: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  spectrumMax: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: COLORS.textMuted,
  },
  telemetryBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemetryItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  telemetryKey: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  telemetryVal: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  telemetrySeparator: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.borderDark,
  },
  advisoryNotice: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  advisoryTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  advisoryBody: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 15,
  },
  actionLink: {
    marginTop: SPACING.md,
    paddingVertical: 4,
    alignItems: 'center',
  },
  actionLinkText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 12,
  },
});
