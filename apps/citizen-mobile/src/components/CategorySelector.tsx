/**
 * Canonical Hazard Category Selector
 * Displays field-friendly chips with recognizable icons for the 8 authorized hazard categories.
 * Memoized for lightning-fast rendering.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { REPORT_CATEGORIES, ReportCategory } from '../types/enums';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const CATEGORY_ICONS: Record<ReportCategory, string> = {
  CRACK: '⚡',
  ROCKFALL: '🪨',
  ROAD_BLOCKAGE: '🚧',
  SOIL_MOVEMENT: '⛰️',
  SEEPAGE: '💧',
  FLOODING: '🌊',
  LANDSLIDE: '🚨',
  OTHER: '⚠️',
};

interface CategorySelectorProps {
  selectedCategory: ReportCategory | null;
  onSelectCategory: (category: ReportCategory) => void;
}

const CategorySelectorComponent: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const selectedItem = REPORT_CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Incident Category</Text>
        <Text style={styles.requiredBadge}>* Required</Text>
      </View>

      <View style={styles.grid}>
        {REPORT_CATEGORIES.map((item) => {
          const isSelected = selectedCategory === item.id;
          const icon = CATEGORY_ICONS[item.id] || '⚠️';

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
              onPress={() => onSelectCategory(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipIcon}>{icon}</Text>
              <Text
                style={[
                  styles.chipLabel,
                  isSelected && styles.chipLabelSelected,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedItem && (
        <View style={styles.descriptionBox}>
          <Text style={styles.selectedDescription} numberOfLines={2}>
            <Text style={styles.descTitle}>{selectedItem.label}: </Text>
            {selectedItem.description}
          </Text>
        </View>
      )}
    </View>
  );
};

CategorySelectorComponent.displayName = 'CategorySelector';
export const CategorySelector = memo(CategorySelectorComponent);

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
  requiredBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 7,
    paddingHorizontal: 10,
    margin: 3,
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
    borderWidth: 1.5,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  chipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  chipLabelSelected: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    marginTop: 6,
  },
  selectedDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  descTitle: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
