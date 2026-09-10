import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius, fontSize } from '../theme/theme';

/**
 * Outbreak Alert Banner
 */
export const OutbreakBanner = ({ alert, onPress, colors }) => {
  if (!alert) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.outbreakBanner,
        {
          backgroundColor: colors.danger + '15',
          borderColor: colors.danger + '40',
        },
      ]}
    >
      <View style={[styles.outbreakIconContainer, { backgroundColor: colors.danger + '25' }]}>
        <Ionicons name="alert-circle" size={22} color={colors.dangerLight} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.outbreakTitle, { color: colors.dangerLight }]}>
          ⚠️ Active Outbreak — {alert.symptom}
        </Text>
        <Text style={[styles.outbreakSubtitle, { color: colors.textMuted }]}>
          {alert.case_count} cases detected in the last {alert.window_days} days
        </Text>
      </View>
      <Ionicons name="arrow-forward" size={18} color={colors.dangerLight} />
    </TouchableOpacity>
  );
};

/**
 * Enhanced Stat Card
 */
export const StatCard = ({ icon, label, value, color, colors }) => (
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={[styles.statNumber, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
  </View>
);

/**
 * Simplified Symptom Chart (Bars)
 */
export const SymptomChart = ({ data, colors }) => {
  if (!data || data.length === 0) return null;

  // Find max value for scaling
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const chartColors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <View style={[styles.chartContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.chartTitle, { color: colors.text }]}>
        Symptom Frequency
        <Text style={{ fontSize: 10, fontWeight: 'normal', color: colors.textMuted }}> (Top 5)</Text>
      </Text>
      <View style={styles.barsContainer}>
        {data.slice(0, 5).map((item, index) => (
          <View key={item.name} style={styles.barRow}>
            <Text style={[styles.barLabel, { color: colors.textMuted }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.barBackground}>
              <View 
                style={[
                  styles.barFill, 
                  { 
                    width: `${(item.count / maxVal) * 100}%`,
                    backgroundColor: chartColors[index % chartColors.length]
                  }
                ]} 
              />
            </View>
            <Text style={[styles.barValue, { color: colors.text }]}>{item.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outbreakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  outbreakIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outbreakTitle: { fontSize: 13, fontWeight: '800' },
  outbreakSubtitle: { fontSize: 10, marginTop: 2, fontWeight: '600' },

  statCard: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: '22%',
  },
  statNumber: { fontSize: 26, fontWeight: '700', marginTop: 10 },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 5, textAlign: 'center' },

  chartContainer: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  chartTitle: { fontSize: 14, fontWeight: '800', marginBottom: spacing.lg },
  barsContainer: { gap: spacing.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 70, fontSize: 10, fontWeight: '600' },
  barBackground: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barValue: { width: 25, fontSize: 10, fontWeight: '800', textAlign: 'right' },
});
