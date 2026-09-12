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
        <Text style={styles.label}>OBSERVATION LOCATION & SECTOR (GPS) *</Text>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} disabled={isLoading} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>{isLoading ? 'Locating...' : '🔄 Refresh GPS'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primaryLight} />
            <View style={styles.loadingCol}>
              <Text style={styles.loadingTitle}>Acquiring GPS satellite fix...</Text>
              <Text style={styles.loadingSub}>Triangulating coordinates & resolving exact area sector...</Text>
            </View>
          </View>
        ) : (
          <>
            {/* Prominent Exact Area Name Banner */}
            <View style={styles.areaBanner}>
              <View style={styles.pinCircle}>
                <Text style={styles.pinIcon}>📍</Text>
              </View>
              <View style={styles.areaTextCol}>
                <Text style={styles.areaTitle} numberOfLines={2}>
                  {areaDetails?.areaName || 'Geological Observation Sector'}
                </Text>
                <Text style={styles.areaSubtitle} numberOfLines={2}>
                  {areaDetails?.formattedAddress ||
                    `${areaDetails?.district || 'District Region'}, ${areaDetails?.state || 'Monitoring Zone'}`}
                </Text>
              </View>
            </View>

            {/* Geological Sector & Terrain Classification Box */}
            {areaDetails && (
              <View style={styles.terrainBox}>
                <View style={styles.terrainRow}>
                  <Text style={styles.terrainTag}>GEO-SECTOR</Text>
                  <Text style={styles.terrainVal}>{areaDetails.geologicalGrid || 'NER-GRID-42'}</Text>
                  <View style={styles.dotSeparator} />
                  <Text style={styles.terrainTag}>ELEVATION</Text>
                  <Text style={styles.terrainVal}>~{areaDetails.elevationM || 1485} m MSL</Text>
                </View>
                {areaDetails.terrainZone && (
                  <Text style={styles.terrainZoneText} numberOfLines={1}>
                    🏔️ {areaDetails.terrainZone}
                  </Text>
                )}
              </View>
            )}

            {/* Coordinate Telemetry & Quality Chips */}
            <View style={styles.telemetryRow}>
              <View style={styles.coordBox}>
                <Text style={styles.coordLabel}>WGS-84 FIX</Text>
                <Text style={styles.coordsText}>{formatCoordinates(latitude, longitude)}</Text>
              </View>

              <View style={styles.badgesCol}>
                <View
                  style={[
                    styles.accuracyPill,
                    { backgroundColor: isGoodAccuracy ? '#E8F5E9' : '#FFF3E0' },
                  ]}
                >
                  <Text
                    style={[
                      styles.accuracyText,
                      { color: isGoodAccuracy ? COLORS.online : '#E65100' },
                    ]}
                  >
                    {formatAccuracy(accuracyM)} {isGoodAccuracy ? '• Fix OK' : ''}
                  </Text>
                </View>

                {isMockFallback && (
                  <View style={styles.simPill}>
                    <Text style={styles.simText}>DEMO REGION</Text>
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
    marginVertical: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  refreshBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryLight,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  loadingCol: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  loadingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  loadingSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  areaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  pinCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  pinIcon: {
    fontSize: 18,
  },
  areaTextCol: {
    flex: 1,
  },
  areaTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  areaSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  terrainBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
  },
  terrainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  terrainTag: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  terrainVal: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginLeft: 4,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textMuted,
    marginHorizontal: 8,
  },
  terrainZoneText: {
    fontSize: 10,
    color: '#0369A1',
    fontWeight: '600',
    marginTop: 3,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 6,
  },
  coordBox: {
    flex: 1,
  },
  coordLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  coordsText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  accuracyPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
  },
  accuracyText: {
    fontSize: 10,
    fontWeight: '800',
  },
  simPill: {
    backgroundColor: '#EDE7F6',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
  },
  simText: {
    color: '#512DA8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorNote: {
    marginTop: 6,
    fontSize: 11,
    color: '#D32F2F',
  },
});
