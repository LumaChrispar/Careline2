import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, fontSize } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { OutbreakBanner, StatCard, SymptomChart } from '../components/DashboardComponents';

export default function DoctorDashboardScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState({ patients: 0, pendingLabs: 0, activeAlerts: 0 });
  const [activeAlert, setActiveAlert] = useState(null);
  const [symptomData, setSymptomData] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recentVisits, setRecentVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Fetch System Stats
      const [pCount, lCount, aCount] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('lab_results').select('*', { count: 'exact', head: true }).is('notified_at', null),
        supabase.from('outbreak_alerts').select('*', { count: 'exact', head: true }).is('resolved_at', null),
      ]);

      setStats({
        patients: pCount.count || 0,
        pendingLabs: lCount.count || 0,
        activeAlerts: aCount.count || 0,
      });

      // 2. Fetch Active Alert
      const { data: alerts } = await supabase
        .from('outbreak_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('triggered_at', { ascending: false })
        .limit(1);
      
      if (alerts && alerts.length > 0) setActiveAlert(alerts[0]);

      // 3. Fetch Notifications
      const { data: notes } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (notes) setNotifications(notes);

      // 4. Fetch Recent Visits for List AND Symptom Chart
      const { data: visits } = await supabase
        .from('visits')
        .select(`
          id,
          date,
          diagnosis,
          symptoms,
          patients (first_name, last_name)
        `)
        .order('date', { ascending: false })
        .limit(20);

      if (visits) {
        setRecentVisits(visits);
        
        // Calculate symptom frequency
        const counts = {};
        visits.forEach(v => {
          (v.symptoms || []).forEach(s => {
            counts[s] = (counts[s] || 0) + 1;
          });
        });
        const chartData = Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        setSymptomData(chartData);
      }

    } catch (error) {
      console.error('Error loading doctor dashboard:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
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
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>System Overview</Text>
        </View>
        <TouchableOpacity style={[styles.profileBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <OutbreakBanner alert={activeAlert} colors={colors} />

      <View style={styles.statsGrid}>
        <StatCard icon="people" label="Patients" value={stats.patients} color={colors.primary} colors={colors} />
        <StatCard icon="flask" label="Pending" value={stats.pendingLabs} color={colors.warning} colors={colors} />
        <StatCard icon="alert-circle" label="Alerts" value={stats.activeAlerts} color={colors.danger} colors={colors} />
        <StatCard icon="refresh" label="Sync" value="100%" color={colors.accent} colors={colors} />
      </View>

      <SymptomChart data={symptomData} colors={colors} />

      {/* Notifications Feed */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activities</Text>
        <View style={[styles.feedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {notifications.length === 0 ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center' }}>No recent activities.</Text>
          ) : (
            notifications.map((n, i) => (
              <View key={n.id} style={[styles.feedItem, i < notifications.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.feedDot, { backgroundColor: colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.feedMessage, { color: colors.textSecondary }]} numberOfLines={2}>{n.message}</Text>
                  <Text style={[styles.feedTime, { color: colors.textMuted }]}>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recently Registered</Text>
          <TouchableOpacity>
            <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {recentVisits.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.textMuted }}>No recent records.</Text>
          </View>
        ) : (
          recentVisits.slice(0, 5).map((item) => (
            <TouchableOpacity key={item.id} style={[styles.visitItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.initials, { backgroundColor: colors.primary + '20' }]}>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>
                  {item.patients?.first_name?.[0]}{item.patients?.last_name?.[0]}
                </Text>
              </View>
              <View style={styles.visitInfo}>
                <Text style={[styles.patientName, { color: colors.text }]}>
                  {item.patients?.first_name} {item.patients?.last_name}
                </Text>
                <Text style={[styles.diagnosis, { color: colors.textSecondary }]}>{item.diagnosis || 'General Checkup'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </View>

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
    paddingHorizontal: 4,
  },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: -2 },
  profileBtn: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  
  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl, flexWrap: 'wrap' },

  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  viewAll: { fontSize: 12, fontWeight: '700' },

  feedCard: { padding: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1 },
  feedItem: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, alignItems: 'center' },
  feedDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  feedMessage: { fontSize: 13, fontWeight: '600' },
  feedTime: { fontSize: 10, marginTop: 4, fontWeight: '700' },
  
  visitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  initials: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  visitInfo: { flex: 1 },
  patientName: { fontSize: fontSize.md, fontWeight: '700' },
  diagnosis: { fontSize: 11, marginTop: 2 },
  emptyCard: { padding: spacing.xl, borderRadius: borderRadius.lg, borderWidth: 1, alignItems: 'center' },
});
