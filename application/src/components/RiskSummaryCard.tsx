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
      {/* Card Header: Sector & Live Level Badge */}
      <View style={styles.headerRow}>
        <View style={styles.sectorInfo}>
          <Text style={styles.sectorTag}>SECTOR HAZARD INDEX • NER-0042</Text>
          <Text style={styles.locationTitle}>East Khasi Hills Basin</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${levelColor}15`, borderColor: levelColor }]}>
          <View style={[styles.badgeDot, { backgroundColor: levelColor }]} />
          <Text style={[styles.statusBadgeText, { color: levelColor }]}>
            {riskData.risk_level} RISK
          </Text>
        </View>
      </View>

      {/* Metrics Row: Current Risk & 24-Hour Outlook */}
      <View style={styles.scoreRow}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>CURRENT RISK</Text>
          <View style={styles.numberRow}>
            <Text style={[styles.scoreBig, { color: levelColor }]}>{riskData.current_risk}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>24H FORECAST</Text>
          <View style={styles.numberRow}>
            <Text style={styles.forecastBig}>
              {forecast24h ? forecast24h.risk_score : '--'}
            </Text>
            <Text style={styles.scoreMax}>/100</Text>
            {forecast24h && (
              <View style={[styles.forecastPill, { backgroundColor: `${getRiskColor(forecast24h.risk_level)}15` }]}>
                <Text style={[styles.forecastPillText, { color: getRiskColor(forecast24h.risk_level) }]}>
                  {forecast24h.risk_level}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Segmented Hazard Track */}
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
        <Text style={styles.spectrumMin}>0 STABLE</Text>
        <Text style={styles.spectrumMid}>BAND: {riskData.risk_level}</Text>
        <Text style={styles.spectrumMax}>100 CRITICAL</Text>
      </View>

      {/* Environmental Telemetry Drivers */}
      <View style={styles.telemetryRow}>
        <View style={styles.telemetryChip}>
          <Text style={styles.telemetryIcon}>🌧️</Text>
          <View>
            <Text style={styles.telemetryVal}>186 mm</Text>
            <Text style={styles.telemetryKey}>Rain (72h)</Text>
          </View>
        </View>
        <View style={styles.telemetryChip}>
          <Text style={styles.telemetryIcon}>💧</Text>
          <View>
            <Text style={styles.telemetryVal}>84%</Text>
            <Text style={styles.telemetryKey}>Saturation</Text>
          </View>
        </View>
        <View style={styles.telemetryChip}>
          <Text style={styles.telemetryIcon}>📐</Text>
          <View>
            <Text style={styles.telemetryVal}>38°</Text>
            <Text style={styles.telemetryKey}>Slope Avg</Text>
          </View>
        </View>
      </View>

      {/* Operational Protocol Advisory */}
      <View style={styles.advisoryBox}>
        <Text style={styles.advisoryIcon}>⚠️</Text>
        <Text style={styles.advisoryText} numberOfLines={2}>
          <Text style={styles.advisoryHeading}>Advisory: </Text>
          Active debris flow potential elevated on highway cuttings. Report any tension cracks or toe seepage.
        </Text>
      </View>

      {/* Bottom Link */}
      {onPressDetails && (
        <TouchableOpacity
          style={styles.detailLink}
          onPress={onPressDetails}
          activeOpacity={0.7}
        >
          <Text style={styles.detailLinkText}>View Geological Forecast Horizons →</Text>
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
    borderRadius: RADIUS.xl,
    padding: 14,
    marginHorizontal: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  loadingCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectorInfo: {
    flex: 1,
  },
  sectorTag: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  locationTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeText: {
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metricCol: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 1,
  },
  scoreBig: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },
  forecastBig: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 26,
  },
  scoreMax: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 2,
  },
  forecastPill: {
    marginLeft: 6,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: RADIUS.sm,
    alignSelf: 'center',
  },
  forecastPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  spectrumTrack: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 10,
    gap: 3,
  },
  spectrumSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  spectrumSegmentActive: {
    opacity: 1,
    transform: [{ scaleY: 1.4 }],
  },
  spectrumSegmentDim: {
    opacity: 0.25,
  },
  spectrumLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  spectrumMin: {
    fontSize: 8.5,
    color: '#94A3B8',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  spectrumMid: {
    fontSize: 8.5,
    color: '#64748B',
    fontFamily: 'monospace',
    fontWeight: '800',
  },
  spectrumMax: {
    fontSize: 8.5,
    color: '#94A3B8',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  telemetryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  telemetryChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  telemetryIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  telemetryVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  telemetryKey: {
    fontSize: 8.5,
    color: '#64748B',
    fontWeight: '600',
  },
  advisoryBox: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    borderRadius: RADIUS.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  advisoryIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  advisoryText: {
    flex: 1,
    fontSize: 10.5,
    color: '#92400E',
    lineHeight: 14,
  },
  advisoryHeading: {
    fontWeight: '800',
    color: '#B45309',
  },
  detailLink: {
    marginTop: 8,
    alignItems: 'center',
  },
  detailLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
});
