import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, fontSize } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { OutbreakBanner, StatCard } from '../components/DashboardComponents';
import RegisterPatientModal from '../components/RegisterPatientModal';

export default function ReceptionistDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const [stats, setStats] = useState({ patients: 0, pendingLabs: 0, activeAlerts: 0 });
  const [activeAlert, setActiveAlert] = useState(null);
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
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

      const { data: alerts } = await supabase
        .from('outbreak_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('triggered_at', { ascending: false })
        .limit(1);
      
      if (alerts && alerts.length > 0) setActiveAlert(alerts[0]);

      const { data } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setPatients(data);

    } catch (error) {
      console.error('Error loading receptionist dashboard:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  const filteredPatients = patients.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Reception</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Patient Registration Hub</Text>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="person-add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <OutbreakBanner alert={activeAlert} colors={colors} />

      <View style={styles.statsGrid}>
        <StatCard icon="people" label="Patients" value={stats.patients} color={colors.primary} colors={colors} />
        <StatCard icon="flask" label="Pending" value={stats.pendingLabs} color={colors.warning} colors={colors} />
        <StatCard icon="alert-circle" label="Alerts" value={stats.activeAlerts} color={colors.danger} colors={colors} />
        <StatCard icon="wifi" label="Sync" value="100%" color={colors.accent} colors={colors} />
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by ID or Name..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECENTLY REGISTERED</Text>
          <Text style={[styles.countBadge, { backgroundColor: colors.primary + '20', color: colors.primary }]}>
            {patients.length}
          </Text>
        </View>

        {filteredPatients.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
             <Text style={{ color: colors.textMuted }}>No patients found.</Text>
          </View>
        ) : (
          filteredPatients.map((p) => (
            <TouchableOpacity 
              key={p.id} 
              style={[styles.patientCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => navigation.navigate('PatientDetail', { patientId: p.id })}
            >
              <View style={[styles.initials, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.initialsText, { color: colors.primary }]}>{p.first_name?.[0]}{p.last_name?.[0]}</Text>
              </View>
              <View style={styles.patientInfo}>
                <Text style={[styles.patientName, { color: colors.text }]}>{p.first_name} {p.last_name}</Text>
                <View style={styles.idRow}>
                  <Ionicons name="finger-print" size={12} color={colors.primary} />
                  <Text style={[styles.patientId, { color: colors.primary }]}>{p.id}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <RegisterPatientModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        onRegister={(newPatient) => {
          setPatients([newPatient, ...patients]);
          loadDashboardData();
        }}
        colors={colors}
      />
    </View>
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
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: -2 },
  addButton: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl, flexWrap: 'wrap' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: fontSize.md },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md, marginLeft: 4 },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  countBadge: { fontSize: 10, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  initials: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  initialsText: { fontWeight: '800', fontSize: 16 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: fontSize.md, fontWeight: '700' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  patientId: { fontSize: 11, fontWeight: '800' },
  emptyCard: { padding: spacing.xl, borderRadius: borderRadius.lg, borderWidth: 1, alignItems: 'center' },
});
