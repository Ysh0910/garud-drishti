/**
 * Field-optimised institutional design system for GARUD DRISHTI
 * Crafted for professional disaster management authorities and field responders.
 */

import { RiskLevel, ReportStatus } from '../types/enums';

export const COLORS = {
  // Institutional Brand
  primary: '#0F172A',         // Slate 900
  primaryLight: '#1E293B',    // Slate 800
  primaryDark: '#020617',     // Slate 950
  accent: '#DC2626',          // Alert Red
  accentAmber: '#D97706',     // Amber 600
  accentTeal: '#0D9488',      // Teal 600
  
  // Surfaces & Backgrounds
  background: '#F8FAFC',      // Slate 50
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F1F5F9',    // Slate 100
  border: '#E2E8F0',          // Slate 200
  borderDark: '#CBD5E1',      // Slate 300

  // Typography
  textPrimary: '#0F172A',     // Slate 900
  textSecondary: '#475569',   // Slate 600
  textMuted: '#94A3B8',       // Slate 400
  textInverse: '#FFFFFF',

  // Canonical Risk Levels
  riskVeryLow: '#10B981',     // Emerald 500
  riskLow: '#059669',         // Emerald 600
  riskModerate: '#D97706',    // Amber 600
  riskHigh: '#EA580C',        // Orange 600
  riskCritical: '#DC2626',    // Red 600

  // Report Lifecycle Statuses
  statusPending: '#7C3AED',   // Violet 600
  statusReview: '#2563EB',    // Blue 600
  statusProbable: '#D97706',  // Amber 600
  statusVerified: '#059669',  // Emerald 600
  statusRejected: '#64748B',  // Slate 500

  // Connectivity
  online: '#059669',
  offline: '#DC2626',
  syncing: '#2563EB',
};

export const getRiskColor = (level: RiskLevel): string => {
  switch (level) {
    case 'VERY_LOW':
      return COLORS.riskVeryLow;
    case 'LOW':
      return COLORS.riskLow;
    case 'MODERATE':
      return COLORS.riskModerate;
    case 'HIGH':
      return COLORS.riskHigh;
    case 'CRITICAL':
      return COLORS.riskCritical;
    default:
      return COLORS.riskLow;
  }
};

export const getStatusColor = (status: ReportStatus): string => {
  switch (status) {
    case 'PENDING':
      return COLORS.statusPending;
    case 'REVIEW':
      return COLORS.statusReview;
    case 'PROBABLE':
      return COLORS.statusProbable;
    case 'VERIFIED':
      return COLORS.statusVerified;
    case 'REJECTED':
      return COLORS.statusRejected;
    default:
      return COLORS.textMuted;
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
