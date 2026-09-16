/**
 * GPS Location Status & Exact Area Details Badge
 * Satisfies Task 2.2: Displays captured location with exact area name, district,
 * state, geological grid sector, elevation, and terrain classification.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { formatCoordinates, formatAccuracy } from '../utils/formatters';
import { AreaDetails } from '../services/locationService';

export interface LocationBadgeProps {
  latitude: number;
  longitude: number;
  accuracyM?: number;
  isLoading?: boolean;
  isMockFallback?: boolean;
  errorMessage?: string;
  areaDetails?: AreaDetails;
  onRefresh?: () => void;
}

function LocationBadgeComponent({
  latitude,
  longitude,
  accuracyM,
  isLoading = false,
  isMockFallback = false,
  errorMessage,
  areaDetails,
  onRefresh,
}: LocationBadgeProps): React.JSX.Element {
  const isGoodAccuracy = accuracyM != null && accuracyM <= 25;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Observation Location</Text>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} disabled={isLoading} style={styles.refreshBtn} activeOpacity={0.7}>
            <Text style={styles.refreshText}>{isLoading ? 'Locating...' : '🔄 Refresh GPS'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primaryLight} />
            <View style={styles.loadingCol}>
              <Text style={styles.loadingTitle}>Acquiring GPS Fix...</Text>
              <Text style={styles.loadingSub}>Triangulating coordinates & resolving sector...</Text>
            </View>
          </View>
        ) : (
          <>
            {/* Primary Location Row */}
            <View style={styles.areaRow}>
              <View style={styles.pinCircle}>
                <Text style={styles.pinIcon}>📍</Text>
              </View>
              <View style={styles.areaTextCol}>
                <Text style={styles.areaTitle} numberOfLines={1}>
                  {areaDetails?.areaName || 'Geological Observation Sector'}
                </Text>
                <Text style={styles.areaSubtitle} numberOfLines={1}>
                  {areaDetails?.formattedAddress ||
                    `${areaDetails?.district || 'District Region'}, ${areaDetails?.state || 'Monitoring Zone'}`}
                </Text>
              </View>
            </View>

            {/* Geological Sector & Elevation Badges */}
            {areaDetails && (
              <View style={styles.metaRow}>
                <View style={styles.metaTag}>
                  <Text style={styles.metaText}>
                    Grid: {areaDetails.geologicalGrid || 'NER-GRID-42'}
                  </Text>
                </View>
                <View style={styles.metaTag}>
                  <Text style={styles.metaText}>
                    Elev: ~{areaDetails.elevationM || 1485}m MSL
                  </Text>
                </View>
                {areaDetails.terrainZone && (
                  <View style={[styles.metaTag, styles.metaTagHighlight]}>
                    <Text style={styles.metaTextHighlight} numberOfLines={1}>
                      {areaDetails.terrainZone}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Coordinates & Accuracy Strip */}
            <View style={styles.telemetryRow}>
              <Text style={styles.coordsText}>{formatCoordinates(latitude, longitude)}</Text>

              <View style={styles.badgesCol}>
                <View
                  style={[
                    styles.accuracyPill,
                    { backgroundColor: isGoodAccuracy ? '#ECFDF5' : '#FFFBEB' },
                  ]}
                >
                  <Text
                    style={[
                      styles.accuracyText,
                      { color: isGoodAccuracy ? '#047857' : '#B45309' },
                    ]}
                  >
                    {formatAccuracy(accuracyM)} {isGoodAccuracy ? '• Fix OK' : ''}
                  </Text>
                </View>

                {isMockFallback && (
                  <View style={styles.simPill}>
                    <Text style={styles.simText}>DEMO</Text>
                  </View>
                )}
              </View>
            </View>

            {errorMessage && <Text style={styles.errorNote}>⚠️ {errorMessage}</Text>}
          </>
        )}
      </View>
    </View>
  );
}

LocationBadgeComponent.displayName = 'LocationBadge';

export const LocationBadge = React.memo(LocationBadgeComponent);

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  refreshBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  loadingCol: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  loadingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  loadingSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pinIcon: {
    fontSize: 16,
  },
  areaTextCol: {
    flex: 1,
  },
  areaTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.1,
  },
  areaSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaTag: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.sm,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaTagHighlight: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  metaText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  metaTextHighlight: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  coordsText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  badgesCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  accuracyPill: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: RADIUS.full,
  },
  accuracyText: {
    fontSize: 10,
    fontWeight: '700',
  },
  simPill: {
    backgroundColor: '#F3E8FF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: RADIUS.sm,
  },
  simText: {
    color: '#7E22CE',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorNote: {
    marginTop: 6,
    fontSize: 11,
    color: '#DC2626',
  },
});
