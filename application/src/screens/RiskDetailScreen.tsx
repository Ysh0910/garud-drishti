/**
 * Detailed Local Risk & 24h Forecast Advisory Screen
 * Provides transparent explanation of slope stability, forecast validity, and emergency actions.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { COLORS, getRiskColor, SPACING, RADIUS } from '../constants/theme';
import { formatCoordinates, formatDateTime } from '../utils/formatters';

type RiskDetailRouteProp = RouteProp<RootStackParamList, 'RiskDetail'>;

export function RiskDetailScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<RiskDetailRouteProp>();
  const risk = route.params?.riskData;

  if (!risk) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Risk Advisory</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No risk data currently loaded.</Text>
        </View>
      </View>
    );
  }

  const levelColor = getRiskColor(risk.risk_level);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Local Risk Advisory</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Top Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.zoneName}>NORTH EASTERN REGION — SECTOR GRID</Text>
          <Text style={styles.zoneCoords}>
            {formatCoordinates(risk.latitude, risk.longitude)}
          </Text>

          <View style={styles.levelRow}>
            <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
              <Text style={styles.levelText}>{risk.risk_level} RISK</Text>
            </View>
            <Text style={styles.stateText}>State: {risk.risk_state}</Text>
          </View>

          <Text style={styles.updatedAt}>
            Updated: {formatDateTime(risk.updated_at)} • Quality: {risk.data_quality}
          </Text>
        </View>

        {/* Model Metrics Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>HAZARD ESTIMATION BREAKDOWN</Text>

          <View style={styles.metricRow}>
            <View>
              <Text style={styles.metricTitle}>Current Dynamic Risk</Text>
              <Text style={styles.metricSub}>Combined terrain + monsoon rainfall</Text>
            </View>
            <Text style={[styles.metricValue, { color: levelColor }]}>
              {risk.current_risk}/100
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricRow}>
            <View>
              <Text style={styles.metricTitle}>Base Terrain Susceptibility</Text>
              <Text style={styles.metricSub}>Slope angle, geology, fault distance</Text>
            </View>
            <Text style={styles.metricValueMuted}>
              {risk.base_susceptibility}/100
            </Text>
          </View>
        </View>

        {/* Forecast Horizons */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>FORECAST HORIZONS</Text>

          {risk.forecasts.map((f) => (
            <View key={f.horizon} style={styles.forecastRow}>
              <View style={styles.horizonLabelCol}>
                <Text style={styles.horizonName}>{f.horizon.toUpperCase()} OUTLOOK</Text>
                <Text style={[styles.horizonTag, f.validated ? styles.validatedTag : styles.provisionalTag]}>
                  {f.validated ? '✓ Validated Model' : '⚠️ Provisional / Uncalibrated'}
                </Text>
              </View>

              <View style={styles.forecastScoreCol}>
                <Text style={[styles.forecastScore, { color: getRiskColor(f.risk_level) }]}>
                  {f.risk_score}
                </Text>
                <Text style={styles.forecastLevel}>{f.risk_level}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actionable Citizen Guidance */}
        <View style={styles.guidanceCard}>
          <Text style={styles.guidanceTitle}>📋 Actionable Precautions for Residents</Text>
          <Text style={styles.guideItem}>1. Avoid walking or travelling near active debris fans during heavy downpours.</Text>
          <Text style={styles.guideItem}>2. Look out for tension cracks opening in slope crests or tilted roadside poles.</Text>
          <Text style={styles.guideItem}>3. Check that roof runoff and drainage trenches are not saturating the slope.</Text>
          <Text style={styles.guideItem}>4. If ground bulging or rumbling is observed, immediately move to safe higher ground.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: COLORS.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
  headerTitle: {
    color: COLORS.textInverse,
    fontSize: 16,
    fontWeight: '800',
  },
  placeholder: {
    width: 48,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  zoneName: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  zoneCoords: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  levelBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    marginRight: 10,
  },
  levelText: {
    color: COLORS.textInverse,
    fontWeight: '800',
    fontSize: 12,
  },
  stateText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  updatedAt: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 10,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    letterSpacing: 0.5,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  metricValueMuted: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  metricDivider: {
    height: 1,
    backgroundColor: COLORS.surfaceMuted,
    marginVertical: 8,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceMuted,
  },
  horizonLabelCol: {
    flex: 1,
  },
  horizonName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  horizonTag: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  validatedTag: {
    color: COLORS.online,
  },
  provisionalTag: {
    color: '#E65100',
  },
  forecastScoreCol: {
    alignItems: 'flex-end',
  },
  forecastScore: {
    fontSize: 18,
    fontWeight: '800',
  },
  forecastLevel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  guidanceCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  guidanceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 8,
  },
  guideItem: {
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 18,
    marginBottom: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});

RiskDetailScreen.displayName = 'RiskDetailScreen';
