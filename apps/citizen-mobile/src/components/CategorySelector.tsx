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
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>SELECT INCIDENT CATEGORY *</Text>
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
              activeOpacity={0.65}
            >
              <Text style={styles.chipIcon}>{icon}</Text>
              <Text
                style={[
                  styles.chipLabel,
                  isSelected && styles.chipLabelSelected,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedCategory && (
        <View style={styles.descriptionBox}>
          <Text style={styles.selectedDescription}>
            ℹ️ {REPORT_CATEGORIES.find((c) => c.id === selectedCategory)?.description}
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
    marginVertical: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    margin: 4,
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: COLORS.primaryLight,
    borderWidth: 2,
  },
  chipIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chipLabelSelected: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  descriptionBox: {
    backgroundColor: '#F0F4F8',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: 6,
  },
  selectedDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
