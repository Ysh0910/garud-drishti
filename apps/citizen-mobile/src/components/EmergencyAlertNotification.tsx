/**
 * Emergency Alert Notification Banner
 * Institutional early warning alert card displayed directly on the Citizen App home screen
 * whenever an active emergency alert is broadcast by Disaster Management Authorities.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertResponse } from '../types/alerts';
import { COLORS, SPACING, RADIUS, getRiskColor } from '../constants/theme';

interface Props {
  alert: AlertResponse;
  onDismiss: () => void;
}

export const EmergencyAlertNotification: React.FC<Props> = ({ alert, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);
  const color = getRiskColor(alert.severity);

  return (
    <View style={[styles.card, { borderColor: color }]}>
      {/* Alert Header Ribbon */}
      <View style={[styles.headerRibbon, { backgroundColor: color }]}>
        <View style={styles.titleRow}>
          <Text style={styles.pulseIcon}>🚨</Text>
          <Text style={styles.headerTitle}>
            OFFICIAL {alert.severity} EARLY WARNING ALERT
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.zoneRow}>
          <Text style={styles.zoneName}>
            {alert.zone_name || alert.cell_id || 'Regional Corridor'}
          </Text>
          <Text style={styles.timeLabel}>
            {alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'JUST NOW'}
          </Text>
        </View>

        <Text style={styles.triggerText}>
          {alert.trigger_reason || 'Severe landslide hazard trigger observed by state geological monitoring network.'}
        </Text>

        {expanded && (
          <View style={styles.safetyBox}>
            <Text style={styles.safetyTitle}>Recommended Field Precautions:</Text>
            <Text style={styles.safetyItem}>• Stay clear of steep cut-slopes, drainage gullies, and culverts.</Text>
            <Text style={styles.safetyItem}>• Keep emergency supplies and mobile devices fully charged.</Text>
            <Text style={styles.safetyItem}>• Report visible slope cracks or ground deformation immediately.</Text>
            <Text style={styles.safetyItem}>• Contact State Disaster Control Room: 1077 / 112</Text>
          </View>
        )}

        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.detailsBtnText}>
              {expanded ? '▲ Hide Safety Guidelines' : '▼ View Safety Guidelines'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ackBtn, { backgroundColor: color }]}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.ackBtnText}>Acknowledge</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRibbon: {
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseIcon: {
    fontSize: 14,
  },
  headerTitle: {
    color: COLORS.textInverse,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 2,
  },
  closeButtonText: {
    color: COLORS.textInverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  body: {
    padding: SPACING.md,
  },
  zoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  triggerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  safetyBox: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  safetyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  safetyItem: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginVertical: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  detailsBtn: {
    paddingVertical: 4,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },
  ackBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
  },
  ackBtnText: {
    color: COLORS.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
});
