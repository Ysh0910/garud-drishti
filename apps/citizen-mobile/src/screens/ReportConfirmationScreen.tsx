/**
 * Report Submission Confirmation Screen
 * Satisfies Task 6.2 & Section 23/32: Displays receipt, report ID, timestamp, coordinates,
 * visual AI analysis breakdown, and scientific/procedural disclaimers.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { formatCoordinates, formatDateTime } from '../utils/formatters';
import { reportService } from '../services/reportService';
import { CitizenAnalysisData } from '../services/api';

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

  const [analysis, setAnalysis] = useState<CitizenAnalysisData | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    if (!isOfflineQueued && reportId && !reportId.startsWith('QUEUED-')) {
      setLoadingAnalysis(true);
      reportService.getReportAnalysis(reportId)
        .then((res) => {
          if (res) setAnalysis(res);
        })
        .catch(() => {})
        .finally(() => setLoadingAnalysis(false));
    }
  }, [reportId, isOfflineQueued]);

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
            : 'Received and analyzed by the GARUD DRISHTI emergency management pipeline.'}
        </Text>

        {/* AI Intelligence Card (when photo analyzed) */}
        {loadingAnalysis && (
          <View style={styles.aiLoadingBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.aiLoadingText}>Running Computer Vision & Credibility Analysis...</Text>
          </View>
        )}

        {analysis && (
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiTitle}>👁️ Citizen AI Vision Intelligence</Text>
              <View style={[
                styles.priorityBadge,
                analysis.priority_level === 'CRITICAL' ? styles.badgeCritical : styles.badgeHigh
              ]}>
                <Text style={styles.priorityBadgeText}>
                  {analysis.priority_level} PRIORITY ({analysis.response_priority}/100)
                </Text>
              </View>
            </View>

            <View style={styles.scoreGrid}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreNumber}>{analysis.credibility}%</Text>
                <Text style={styles.scoreLabel}>Credibility</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreNumber}>{analysis.observed_impact}%</Text>
                <Text style={styles.scoreLabel}>Impact</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreNumber}>{analysis.environmental_risk}%</Text>
                <Text style={styles.scoreLabel}>Env. Risk</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreNumber}>{analysis.exposure}%</Text>
                <Text style={styles.scoreLabel}>Exposure</Text>
              </View>
            </View>

            {analysis.audit_positive_signals.length > 0 && (
              <View style={styles.signalList}>
                {analysis.audit_positive_signals.map((sig, idx) => (
                  <Text key={idx} style={styles.signalText}>✓ {sig}</Text>
                ))}
              </View>
            )}
          </View>
        )}

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
            <Text style={styles.receiptLabel}>Lifecycle Status</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {analysis ? analysis.status.replace(/_/g, ' ') : (isOfflineQueued ? 'PENDING (OFFLINE)' : 'AUTHORITY REVIEW')}
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
  aiLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    width: '100%',
  },
  aiLoadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 10,
    fontWeight: '600',
  },
  aiCard: {
    backgroundColor: '#F0F4F8',
    borderWidth: 1,
    borderColor: '#D0DBE5',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    width: '100%',
    marginTop: SPACING.lg,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  priorityBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
  },
  badgeCritical: {
    backgroundColor: '#FEE2E2',
  },
  badgeHigh: {
    backgroundColor: '#FEF3C7',
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#991B1B',
  },
  scoreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginVertical: SPACING.xs,
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primary,
  },
  scoreLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '700',
  },
  signalList: {
    marginTop: 6,
  },
  signalText: {
    fontSize: 11,
    color: '#065F46',
    marginVertical: 1,
    fontWeight: '600',
  },
  receiptCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    marginTop: SPACING.lg,
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
