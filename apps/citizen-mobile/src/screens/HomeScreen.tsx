/**
 * Citizen App Home Screen
 * Institutional Geological Hazard Intelligence Dashboard
 * Designed for immediate field usability and authoritative situational awareness.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { Header } from '../components/Header';
import { RiskSummaryCard } from '../components/RiskSummaryCard';
import { OfflineQueueBanner } from '../components/OfflineQueueBanner';
import { ReportCard } from '../components/ReportCard';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { RiskService } from '../services/riskService';
import { RiskPointResponse } from '../types/risk';
import { ReportResponse } from '../types/reports';
import { ReportCategory } from '../types/enums';
import { ReportQueueManager } from '../storage/reportQueue';
import { reportService } from '../services/reportService';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [riskData, setRiskData] = useState<RiskPointResponse | null>(null);
  const [recentReports, setRecentReports] = useState<ReportResponse[]>([]);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const risk = await RiskService.getLocalRisk();
      setRiskData(risk);

      const pending = await ReportQueueManager.getPendingItems();
      setPendingQueueCount(pending.length);

      const reports = await reportService.getReports();
      setRecentReports(reports.slice(0, 3));
    } catch (err) {
      console.error('Failed loading home data', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleQuickReport = (cat?: ReportCategory) => {
    navigation.navigate('ReportHazard', cat ? { preselectedCategory: cat } : undefined);
  };

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Offline Queue Notification Banner */}
        <OfflineQueueBanner
          pendingCount={pendingQueueCount}
          onSyncComplete={loadData}
        />

        {/* Tactical Risk Spectrum & Telemetry Card */}
        <RiskSummaryCard
          riskData={riskData}
          onPressDetails={() => navigation.navigate('RiskDetail', { riskData: riskData ?? undefined })}
        />

        {/* Primary Action: Field Hazard Observation */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => handleQuickReport()}
            activeOpacity={0.8}
          >
            <View style={styles.reportIconBox}>
              <Text style={styles.reportIconSymbol}>+</Text>
            </View>
            <View style={styles.reportButtonTextCol}>
              <Text style={styles.reportButtonTitle}>FILE GROUND HAZARD REPORT</Text>
              <Text style={styles.reportButtonSub}>
                Direct GPS & Live Camera Evidence Dispatch
              </Text>
            </View>
            <Text style={styles.reportArrow}>→</Text>
          </TouchableOpacity>

          {/* Quick Precursor Shortcuts */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleQuickReport('CRACK')}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipIcon}>⚡</Text>
              <Text style={styles.quickChipText}>Crack</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleQuickReport('ROCKFALL')}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipIcon}>🪨</Text>
              <Text style={styles.quickChipText}>Rockfall</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleQuickReport('ROAD_BLOCKAGE')}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipIcon}>🚧</Text>
              <Text style={styles.quickChipText}>Road Block</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Incidents Dispatch List */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>SECTOR OBSERVATION LOG</Text>
            <Text style={styles.sectionSubtitle}>Verified Authority Situational Stream</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('MyReports')}>
            <Text style={styles.viewAllText}>All Reports ({recentReports.length}) →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reportsContainer}>
          {recentReports.length > 0 ? (
            recentReports.map((report) => (
              <ReportCard key={report.report_id || report.client_report_id} report={report} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No active hazard records logged in this grid cell.</Text>
              <Text style={styles.emptyStateSub}>
                Field observations submitted by citizens and responders automatically update the district early-warning model.
              </Text>
            </View>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  actionSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  reportButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  reportIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  reportIconSymbol: {
    fontSize: 22,
    color: '#FFF',
    fontWeight: '900',
    lineHeight: 24,
  },
  reportButtonTextCol: {
    flex: 1,
  },
  reportButtonTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  reportButtonSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  reportArrow: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '800',
  },
  quickRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  quickChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  quickChipIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  reportsContainer: {
    paddingHorizontal: SPACING.lg,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyStateText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyStateSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});

HomeScreen.displayName = 'HomeScreen';

