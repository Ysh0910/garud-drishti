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
import { EmergencyAlertNotification } from '../components/EmergencyAlertNotification';
import { ReportCard } from '../components/ReportCard';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { RiskService } from '../services/riskService';
import { alertService } from '../services/alertService';
import { AlertResponse } from '../types/alerts';
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
  const [activeAlert, setActiveAlert] = useState<AlertResponse | null>(null);

  const loadData = useCallback(async () => {
    try {
      const risk = await RiskService.getLocalRisk();
      setRiskData(risk);

      const pending = await ReportQueueManager.getPendingItems();
      setPendingQueueCount(pending.length);

      const reports = await reportService.getReports();
      setRecentReports(reports.slice(0, 3));

      // Also check latest active alerts
      const active = await alertService.getActiveAlerts();
      if (active.length > 0) {
        setActiveAlert(active[0]);
      }
    } catch (err) {
      console.error('Failed loading home data', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    alertService.requestNotificationPermission();
    alertService.startPolling(4000);

    const unsubAlerts = alertService.subscribe((newAlert) => {
      setActiveAlert(newAlert);
    });

    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return () => {
      alertService.stopPolling();
      unsubAlerts();
      unsubscribe();
    };
  }, [navigation, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDismissAlert = (alertId: string) => {
    alertService.dismissAlert(alertId);
    setActiveAlert(null);
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Offline Queue Notification Banner */}
        <OfflineQueueBanner
          pendingCount={pendingQueueCount}
          onSyncComplete={loadData}
        />

        {/* Live Authority Emergency Alert Notification Banner */}
        {activeAlert && (
          <EmergencyAlertNotification
            alert={activeAlert}
            onDismiss={() => handleDismissAlert(activeAlert.alert_id)}
          />
        )}

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
            activeOpacity={0.85}
          >
            <View style={styles.reportIconBox}>
              <Text style={styles.reportIconSymbol}>📸</Text>
            </View>
            <View style={styles.reportButtonTextCol}>
              <Text style={styles.reportButtonTitle}>Report Ground Hazard</Text>
              <Text style={styles.reportButtonSub}>
                Direct GPS & Live Camera Evidence Dispatch
              </Text>
            </View>
            <View style={styles.reportArrowCircle}>
              <Text style={styles.reportArrow}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Quick Precursor Shortcuts */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={[styles.quickChip, styles.quickChipCrack]}
              onPress={() => handleQuickReport('CRACK')}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipIcon}>⚡</Text>
              <Text style={styles.quickChipText}>Crack</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickChip, styles.quickChipRock]}
              onPress={() => handleQuickReport('ROCKFALL')}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipIcon}>🪨</Text>
              <Text style={styles.quickChipText}>Rockfall</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickChip, styles.quickChipRoad]}
              onPress={() => handleQuickReport('ROAD_BLOCKAGE')}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipIcon}>🚧</Text>
              <Text style={styles.quickChipText}>Blockage</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickChip, styles.quickChipSoil]}
              onPress={() => handleQuickReport('SOIL_MOVEMENT')}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipIcon}>⛰️</Text>
              <Text style={styles.quickChipText}>Soil Move</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Incidents Dispatch List */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Sector Observation Stream</Text>
            <Text style={styles.sectionSubtitle}>Verified field ground-truth telemetry</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('MyReports')} activeOpacity={0.7}>
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
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>🛰️</Text>
              </View>
              <Text style={styles.emptyStateText}>No Active Incidents in Grid NER-0042</Text>
              <Text style={styles.emptyStateSub}>
                Field observations submitted by citizens and volunteers dynamically calibrate the regional landslide model.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => handleQuickReport()}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyActionText}>+ File Observation</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  actionSection: {
    paddingHorizontal: 14,
    marginTop: 12,
  },
  reportButton: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.xl,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  reportIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportIconSymbol: {
    fontSize: 18,
  },
  reportButtonTextCol: {
    flex: 1,
  },
  reportButtonTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  reportButtonSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  reportArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportArrow: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '800',
  },
  quickRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  quickChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingVertical: 6,
    paddingHorizontal: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  quickChipCrack: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  quickChipRock: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  quickChipRoad: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  quickChipSoil: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  quickChipIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  quickChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.1,
  },
  sectionSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  reportsContainer: {
    paddingHorizontal: 14,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  emptyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyIcon: {
    fontSize: 18,
  },
  emptyStateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptyStateSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 15,
  },
  emptyActionBtn: {
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  emptyActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});

HomeScreen.displayName = 'HomeScreen';
