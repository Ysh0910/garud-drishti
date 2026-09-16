/**
 * Report Submission Confirmation Screen
 * Satisfies Task 6.2: Displays receipt, report ID, timestamp, coordinates,
 * and scientific/procedural disclaimers.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { formatCoordinates, formatDateTime } from '../utils/formatters';

type ConfirmationNavProp = StackNavigationProp<RootStackParamList, 'ReportConfirmation'>;
type ConfirmationRouteProp = RouteProp<RootStackParamList, 'ReportConfirmation'>;

export function ReportConfirmationScreen(): React.JSX.Element {
  const navigation = useNavigation<ConfirmationNavProp>();
  const route = useRoute<ConfirmationRouteProp>();
  const {
    reportId,
    clientReportId,
    capturedAt,
    category,
    latitude,
    longitude,
    isOfflineQueued,
  } = route.params;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.checkIcon}>{isOfflineQueued ? '📥' : '✅'}</Text>
        </View>

        <Text style={styles.title}>
          {isOfflineQueued ? 'Report Queued Offline' : 'Observation Submitted'}
        </Text>

        <Text style={styles.subtitle}>
          {isOfflineQueued
            ? 'Stored locally on device. Will automatically sync to disaster authorities upon reconnection.'
            : 'Received by the GARUD DRISHTI emergency management pipeline.'}
        </Text>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Report Reference ID</Text>
            <Text style={styles.receiptValueBold}>{reportId}</Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Client UUID</Text>
            <Text style={styles.receiptValueMono}>{clientReportId.substring(0, 18)}...</Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Incident Category</Text>
            <Text style={styles.receiptValue}>{category.replace(/_/g, ' ')}</Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Observation Time</Text>
            <Text style={styles.receiptValue}>{formatDateTime(capturedAt)}</Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Coordinates (GPS)</Text>
            <Text style={styles.receiptValue}>{formatCoordinates(latitude, longitude)}</Text>
          </View>

          <View style={[styles.receiptRow, styles.lastRow]}>
            <Text style={styles.receiptLabel}>Initial Status</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {isOfflineQueued ? 'PENDING (OFFLINE)' : 'PENDING REVIEW'}
              </Text>
            </View>
          </View>
        </View>

        {/* Essential Scientific & Authority Disclaimer */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>🛡️ Operational Notice</Text>
          <Text style={styles.noticeBody}>
            Citizen hazard reports serve as **supporting observational evidence** for district disaster authorities.
            They do not trigger public sirens or emergency declarations automatically without expert human review.
          </Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('MyReports')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>View in My Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Return to Home Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.xl,
    alignItems: 'center',
    paddingTop: SPACING.xxl * 1.5,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  checkIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 320,
  },
  receiptCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    marginTop: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceMuted,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  receiptLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  receiptValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryLight,
  },
  receiptValueMono: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.textSecondary,
  },
  statusPill: {
    backgroundColor: '#EDE7F6',
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#512DA8',
  },
  noticeBox: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    width: '100%',
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E65100',
    marginBottom: 4,
  },
  noticeBody: {
    fontSize: 12,
    color: '#4E342E',
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: COLORS.primaryLight,
    fontWeight: '700',
    fontSize: 14,
  },
});

ReportConfirmationScreen.displayName = 'ReportConfirmationScreen';

