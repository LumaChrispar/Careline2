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

export default function AdminDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const [stats, setStats] = useState({ patients: 0, pendingLabs: 0, activeAlerts: 0, staff: 0 });
  const [activeAlert, setActiveAlert] = useState(null);
  const [symptomData, setSymptomData] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // 1. Fetch System Stats
      const [pCount, lCount, aCount, sCount] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('lab_results').select('*', { count: 'exact', head: true }).is('notified_at', null),
        supabase.from('outbreak_alerts').select('*', { count: 'exact', head: true }).is('resolved_at', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'patient'),
      ]);

      setStats({
        patients: pCount.count || 0,
        pendingLabs: lCount.count || 0,
        activeAlerts: aCount.count || 0,
        staff: sCount.count || 0,
      });

      // 2. Fetch Active Alert
      const { data: alerts } = await supabase
        .from('outbreak_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('triggered_at', { ascending: false })
        .limit(1);
      
      if (alerts && alerts.length > 0) setActiveAlert(alerts[0]);

      // 3. Fetch Notifications (System Logs)
      const { data: notes } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (notes) setNotifications(notes);

      // 4. Fetch Visits for Symptom Chart
      const { data: visits } = await supabase
        .from('visits')
        .select('symptoms')
        .order('date', { ascending: false })
        .limit(100);

      if (visits) {
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
      console.error('Error loading admin dashboard:', error);
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
          <Text style={[styles.title, { color: colors.text }]}>Admin Center</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>System-Wide Oversight</Text>
        </View>
        <TouchableOpacity 
          style={[styles.profileBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <OutbreakBanner alert={activeAlert} colors={colors} onPress={() => navigation.navigate('Outbreak')} />

      <View style={styles.statsGrid}>
        <StatCard icon="people" label="Total Patients" value={stats.patients} color={colors.primary} colors={colors} />
        <StatCard icon="briefcase" label="Active Staff" value={stats.staff} color={colors.accent} colors={colors} />
        <StatCard icon="flask" label="Pending Labs" value={stats.pendingLabs} color={colors.warning} colors={colors} />
        <StatCard icon="alert-circle" label="Active Alerts" value={stats.activeAlerts} color={colors.danger} colors={colors} />
      </View>

      <SymptomChart data={symptomData} colors={colors} />

      <View style={styles.quickActions}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Management</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Users')}
          >
            <Ionicons name="person-add" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Staff Setup</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Outbreak')}
          >
            <Ionicons name="pulse" size={24} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.text }]}>Monitor</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="construct" size={24} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.text }]}>System</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Feed */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>System Notifications</Text>
        <View style={[styles.feedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {notifications.length === 0 ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', padding: 20 }}>No system logs found.</Text>
          ) : (
            notifications.map((n, i) => (
              <View key={n.id} style={[styles.feedItem, i < notifications.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.feedDot, { backgroundColor: n.read ? colors.textMuted : colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.feedMessage, { color: colors.textSecondary }]} numberOfLines={2}>{n.message}</Text>
                  <Text style={[styles.feedTime, { color: colors.textMuted }]}>{new Date(n.created_at).toLocaleString()}</Text>
                </View>
              </View>
            ))
          )}
        </View>
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
  subtitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  profileBtn: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  
  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl, flexWrap: 'wrap' },

  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: spacing.md },

  quickActions: { marginBottom: spacing.xl },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionCard: { flex: 1, padding: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, alignItems: 'center', gap: 8 },
  actionText: { fontSize: 11, fontWeight: '800' },

  feedCard: { padding: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1 },
  feedItem: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, alignItems: 'center' },
  feedDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  feedMessage: { fontSize: 13, fontWeight: '600' },
  feedTime: { fontSize: 10, marginTop: 4, fontWeight: '700' },
});
