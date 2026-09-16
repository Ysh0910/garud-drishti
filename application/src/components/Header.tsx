/**
 * Institutional Top Navigation Bar
 * Real-time hardware telemetry for WiFi, Cellular, Weak Signal, and Offline states.
 * Fully automated detection with zero manual toggling.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { RADIUS } from '../constants/theme';
import { NetworkService, NetworkState } from '../services/networkService';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showNetworkBadge?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  showNetworkBadge = true,
}) => {
  const [network, setNetwork] = useState<NetworkState>(NetworkService.getNetworkState());

  useEffect(() => {
    return NetworkService.subscribeDetailed((state) => {
      setNetwork(state);
    });
  }, []);

  // Determine badge telemetry configuration
  const getBadgeConfig = () => {
    if (!network.isOnline) {
      return {
        symbol: '📵',
        label: 'NO NETWORK',
        bg: 'rgba(239, 68, 68, 0.16)',
        border: 'rgba(239, 68, 68, 0.45)',
        text: '#F87171',
        dot: '#EF4444',
        details: 'No internet connection detected. Reports will be saved locally to the offline queue.',
      };
    }

    if (network.signalQuality === 'weak') {
      return {
        symbol: '📶',
        label: 'LOW SIGNAL',
        bg: 'rgba(245, 158, 11, 0.16)',
        border: 'rgba(245, 158, 11, 0.45)',
        text: '#FBBF24',
        dot: '#F59E0B',
        details: 'Weak or degraded network signal detected. Uploads may take longer.',
      };
    }

    if (network.medium === 'wifi') {
      return {
        symbol: '🛜',
        label: 'WIFI',
        bg: 'rgba(16, 185, 129, 0.16)',
        border: 'rgba(16, 185, 129, 0.4)',
        text: '#34D399',
        dot: '#10B981',
        details: 'High-speed Wi-Fi connection active.',
      };
    }

    if (network.medium === 'cellular') {
      const speedLabel = network.effectiveSpeed && network.effectiveSpeed !== 'unknown'
        ? network.effectiveSpeed.toUpperCase()
        : 'CELLULAR';
      return {
        symbol: '📶',
        label: speedLabel,
        bg: 'rgba(2, 132, 199, 0.16)',
        border: 'rgba(2, 132, 199, 0.4)',
        text: '#38BDF8',
        dot: '#0284C7',
        details: `Connected via mobile cellular network (${speedLabel}).`,
      };
    }

    // Default Online
    return {
      symbol: '📶',
      label: 'ONLINE',
      bg: 'rgba(16, 185, 129, 0.16)',
      border: 'rgba(16, 185, 129, 0.4)',
      text: '#34D399',
      dot: '#10B981',
      details: 'Active internet connection.',
    };
  };

  const badge = getBadgeConfig();

  const handleShowDiagnostics = () => {
    const downlink = network.downlinkMbps ? ` • Downlink: ~${network.downlinkMbps} Mbps` : '';
    const rtt = network.rttMs ? ` • Latency: ${network.rttMs}ms` : '';
    Alert.alert(
      'Network Telemetry (Automated)',
      `${badge.details}\nStatus: ${network.isOnline ? 'Online' : 'Offline'}\nMedium: ${network.medium.toUpperCase()}\nSignal: ${network.signalQuality.toUpperCase()}${downlink}${rtt}\n\nNote: Connectivity is tracked in real-time from device sensors with zero manual toggle.`
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandingCol}>
        <View style={styles.agencyRow}>
          <Text style={styles.agencyBadge}>NER GEOLOGICAL SURVEY</Text>
          <Text style={styles.stationId}>STN-42</Text>
        </View>
        <Text style={styles.title}>GARUD DRISHTI</Text>
        <Text style={styles.subtitle}>Slope Monitoring & Early Warning</Text>
      </View>

      {showNetworkBadge && (
        <TouchableOpacity
          style={[
            styles.statusPill,
            { backgroundColor: badge.bg, borderColor: badge.border },
          ]}
          onPress={handleShowDiagnostics}
          activeOpacity={0.8}
        >
          <View style={[styles.statusDot, { backgroundColor: badge.dot }]} />
          <Text style={styles.symbolText}>{badge.symbol}</Text>
          <Text style={[styles.statusText, { color: badge.text }]}>
            {badge.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

Header.displayName = 'Header';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
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
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  symbolText: {
    fontSize: 11,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
});
