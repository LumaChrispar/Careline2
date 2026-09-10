import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, fontSize } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function OutbreakMonitorScreen() {
  const { colors } = useTheme();
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [resolvedAlerts, setResolvedAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({ active: 0, resolved: 0 });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('outbreak_alerts')
        .select('*')
        .order('triggered_at', { ascending: false });

      if (error) throw error;

      const active = data.filter(a => !a.resolved_at);
      const resolved = data.filter(a => a.resolved_at);
      
      setActiveAlerts(active);
      setResolvedAlerts(resolved);
      setStats({ active: active.length, resolved: resolved.length });
    } catch (error) {
      console.error('Error fetching alerts:', error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleNotify = async (alertId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('outbreak_alerts')
        .update({ 
          authority_notified: true, 
          notified_by: user.id, 
          notified_at: new Date().toISOString() 
        })
        .eq('id', alertId);
      
      if (error) throw error;
      Alert.alert('Authorities Notified', 'Regional health officials have been alerted.');
      fetchAlerts();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleResolve = async (alertId) => {
    Alert.alert(
      'Resolve Alert',
      'Mark this outbreak as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resolve', 
          onPress: async () => {
            const { error } = await supabase
              .from('outbreak_alerts')
              .update({ resolved_at: new Date().toISOString() })
              .eq('id', alertId);
            
            if (error) Alert.alert('Error', error.message);
            else fetchAlerts();
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchAlerts(); }} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Outbreak Monitor</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Public Health Surveillance</Text>
        </View>
        <Ionicons name="alert-circle" size={32} color={stats.active > 0 ? colors.danger : colors.accent} />
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.danger + '15' }]}>
          <Text style={[styles.statValue, { color: colors.danger }]}>{stats.active}</Text>
          <Text style={[styles.statLabel, { color: colors.danger }]}>ACTIVE</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.accent + '15' }]}>
          <Text style={[styles.statValue, { color: colors.accent }]}>{stats.resolved}</Text>
          <Text style={[styles.statLabel, { color: colors.accent }]}>RESOLVED</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>ACTIVE THREATS</Text>
      {activeAlerts.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle" size={40} color={colors.accent} />
          <Text style={{ color: colors.text, fontWeight: '700', marginTop: 12 }}>System Clear</Text>
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>No outbreaks currently detected.</Text>
        </View>
      ) : (
        activeAlerts.map(alert => (
          <View key={alert.id} style={[styles.alertCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.danger, borderLeftWidth: 4 }]}>
            <View style={styles.alertHeader}>
              <Text style={[styles.symptom, { color: colors.text }]}>{alert.symptom}</Text>
              <View style={[styles.caseBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.caseText}>{alert.case_count} CASES</Text>
              </View>
            </View>
            
            <Text style={[styles.alertMeta, { color: colors.textMuted }]}>
              Detected: {new Date(alert.triggered_at).toLocaleDateString()} • Last {alert.window_days} days
            </Text>

            <View style={styles.severityBar}>
              <View style={[styles.severityFill, { width: '70%', backgroundColor: colors.danger }]} />
            </View>

            <View style={styles.alertActions}>
              {!alert.authority_notified ? (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: colors.danger + '20' }]}
                  onPress={() => handleNotify(alert.id)}
                >
                  <Ionicons name="notifications" size={16} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>NOTIFY</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.statusBadge}>
                   <Ionicons name="ribbon" size={14} color={colors.accent} />
                   <Text style={[styles.statusText, { color: colors.accent }]}>NOTIFIED</Text>
                </View>
              )}
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => handleResolve(alert.id)}
              >
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                <Text style={[styles.actionText, { color: colors.accent }]}>RESOLVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {resolvedAlerts.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.xl }]}>HISTORY</Text>
          {resolvedAlerts.map(alert => (
            <View key={alert.id} style={[styles.resolvedItem, { borderBottomColor: colors.border }]}>
               <View style={{ flex: 1 }}>
                  <Text style={[styles.resolvedSymptom, { color: colors.textMuted }]}>{alert.symptom}</Text>
                  <Text style={[styles.resolvedMeta, { color: colors.textMuted }]}>
                    {alert.case_count} cases • Resolved {new Date(alert.resolved_at).toLocaleDateString()}
                  </Text>
               </View>
               <Ionicons name="checkmark-circle" size={20} color={colors.textMuted} />
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: spacing.xl, 
    marginBottom: spacing.lg,
  },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statBox: { flex: 1, paddingVertical: spacing.lg, borderRadius: borderRadius.xl, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '900', marginTop: 4 },

  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: spacing.md },
  emptyCard: { padding: spacing.xxl, borderRadius: borderRadius.xl, borderWidth: 1, alignItems: 'center' },

  alertCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  symptom: { fontSize: 18, fontWeight: '800' },
  caseBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  caseText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  alertMeta: { fontSize: 11, marginTop: 4, fontWeight: '600' },

  severityBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)', marginTop: spacing.md, overflow: 'hidden' },
  severityFill: { height: '100%', borderRadius: 3 },

  alertActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  actionBtn: { flex: 1, flexDirection: 'row', height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 11, fontWeight: '900' },
  statusBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 10, fontWeight: '900' },

  resolvedItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1 },
  resolvedSymptom: { fontSize: 14, fontWeight: '700' },
  resolvedMeta: { fontSize: 11, marginTop: 2 },
});
