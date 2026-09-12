/**
 * Institutional Top Navigation Bar
 * Crafted with agency-level design standards for disaster management authorities.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { NetworkService } from '../services/networkService';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showOfflineToggle?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  showOfflineToggle = true,
}) => {
  const [isOnline, setIsOnline] = useState(NetworkService.getStatus());

  useEffect(() => {
    return NetworkService.subscribe((online) => setIsOnline(online));
  }, []);

  const toggleConnection = () => {
    NetworkService.setOnline(!isOnline);
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandingCol}>
        <View style={styles.agencyRow}>
          <Text style={styles.agencyBadge}>NER GEOLOGICAL SURVEY</Text>
          <Text style={styles.stationId}>STN-42</Text>
        </View>
        <Text style={styles.title}>GARUD DRISHTI</Text>
        <Text style={styles.subtitle}>Early Warning & Slope Monitoring</Text>
      </View>

      {showOfflineToggle && (
        <TouchableOpacity
          style={[
            styles.statusPill,
            { backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(220, 38, 38, 0.12)' },
            { borderColor: isOnline ? 'rgba(16, 185, 129, 0.4)' : 'rgba(220, 38, 38, 0.4)' },
          ]}
          onPress={toggleConnection}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnline ? COLORS.online : COLORS.offline },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isOnline ? COLORS.online : COLORS.offline },
            ]}
          >
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

Header.displayName = 'Header';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  brandingCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  agencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  agencyBadge: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  stationId: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#64748B',
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
});
