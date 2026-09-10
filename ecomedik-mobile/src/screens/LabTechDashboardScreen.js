import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, fontSize } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { OutbreakBanner, StatCard } from '../components/DashboardComponents';

export default function LabTechDashboardScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState({ patients: 0, pendingLabs: 0, activeAlerts: 0 });
  const [activeAlert, setActiveAlert] = useState(null);
  const [pendingLabs, setPendingLabs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Upload Modal State (Pending)
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLab, setSelectedLab] = useState(null);
  const [summary, setSummary] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // New Direct Upload State
  const [newLabModalVisible, setNewLabModalVisible] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [newLabForm, setNewLabForm] = useState({ patient_id: '', test_type: '', summary: '' });
  const [patientSelectVisible, setPatientSelectVisible] = useState(false);

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

      const { data: pats } = await supabase.from('patients').select('id, first_name, last_name, phone');
      if (pats) setPatientsList(pats);

      const { data } = await supabase
        .from('lab_results')
        .select(`
          id,
          test_type,
          uploaded_at,
          patient_id,
          patients (first_name, last_name)
        `)
        .is('summary', null)
        .order('uploaded_at', { ascending: true });

      if (data) setPendingLabs(data);

    } catch (error) {
      console.error('Error loading lab dashboard:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleUpload = async () => {
    if (!summary.trim()) {
      Alert.alert('Required', 'Please provide a test summary/result.');
      return;
    }

    setIsUploading(true);
    try {
      const { error } = await supabase
        .from('lab_results')
        .update({ 
          summary: summary.trim(),
          notified_at: null // Clinician acknowledgement is a separate step.
        })
        .eq('id', selectedLab.id);

      if (error) throw error;

      Alert.alert('Success', 'Lab result uploaded and finalized.');
      setModalVisible(false);
      setSummary('');
      setSelectedLab(null);
      loadDashboardData();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleNewUpload = async () => {
    if (!newLabForm.patient_id || !newLabForm.test_type || !newLabForm.summary) {
      Alert.alert('Required', 'Please fill in patient, test type, and result details.');
      return;
    }
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const facilityId = user?.user_metadata?.facility_id || null;

      const { error } = await supabase.from('lab_results').insert({
        patient_id: newLabForm.patient_id,
        test_type: newLabForm.test_type,
        summary: newLabForm.summary,
        uploaded_by: user.id,
        facility_id: facilityId,
        uploaded_at: new Date().toISOString(),
        notified_at: null // null so doctors and staff actually get notified
      });

      if (error) throw error;
      Alert.alert('Success', 'Direct lab result uploaded successfully.');
      setNewLabModalVisible(false);
      setNewLabForm({ patient_id: '', test_type: '', summary: '' });
      loadDashboardData();
    } catch (error) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setIsUploading(false);
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Lab Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Diagnostic Hub</Text>
        </View>
        <TouchableOpacity style={[styles.profileBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="flask" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <OutbreakBanner alert={activeAlert} colors={colors} />

      <View style={styles.statsGrid}>
        <StatCard icon="people" label="Patients" value={stats.patients} color={colors.primary} colors={colors} />
        <StatCard icon="flask" label="Pending" value={stats.pendingLabs} color={colors.warning} colors={colors} />
        <StatCard icon="alert-circle" label="Alerts" value={stats.activeAlerts} color={colors.danger} colors={colors} />
        <StatCard icon="wifi" label="Sync" value="100%" color={colors.accent} colors={colors} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending Samples</Text>
          <Text style={[styles.countBadge, { backgroundColor: colors.warning + '20', color: colors.warning }]}>
            {pendingLabs.length}
          </Text>
        </View>

        {pendingLabs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.accent} />
            <Text style={{ color: colors.text, fontWeight: '700', marginTop: 12 }}>All caught up!</Text>
            <Text style={{ color: colors.textMuted, marginTop: 4 }}>No pending lab results to process.</Text>
          </View>
        ) : (
          pendingLabs.map((item) => (
            <View key={item.id} style={[styles.labCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.labInfo}>
                <Text style={[styles.patientName, { color: colors.text }]}>
                  {item.patients?.first_name} {item.patients?.last_name}
                </Text>
                <Text style={[styles.labTest, { color: colors.warning }]}>{item.test_type}</Text>
                <Text style={[styles.date, { color: colors.textMuted }]}>
                  Requested: {new Date(item.uploaded_at).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setSelectedLab(item);
                  setSummary('');
                  setModalVisible(true);
                }}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>

    <TouchableOpacity 
      style={[styles.fab, { backgroundColor: colors.accent }]}
      onPress={() => setNewLabModalVisible(true)}
    >
      <Ionicons name="add" size={28} color="#0b0f19" />
      <Text style={[styles.fabText, { color: '#0b0f19' }]}>DIRECT UPLOAD</Text>
    </TouchableOpacity>

    {/* Upload Result Modal */}
    <Modal visible={modalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Upload Lab Result</Text>
          
          {selectedLab && (
            <View style={styles.selectedLabInfo}>
              <Text style={[styles.patientNameModal, { color: colors.text }]}>
                {selectedLab.patients?.first_name} {selectedLab.patients?.last_name}
              </Text>
              <Text style={[styles.testTypeModal, { color: colors.primary }]}>{selectedLab.test_type}</Text>
            </View>
          )}

          <Text style={[styles.label, { color: colors.textSecondary }]}>RESULT SUMMARY</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="Enter the lab findings/results here..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={summary}
            onChangeText={setSummary}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => setModalVisible(false)}
              disabled={isUploading}
            >
              <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: colors.primary }]} 
              onPress={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Result</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Direct Upload Result Modal */}
    <Modal visible={newLabModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Lab Record</Text>
          
          <Text style={[styles.label, { color: colors.textSecondary }]}>SELECT PATIENT *</Text>
          <TouchableOpacity 
            style={[styles.pickerBtn, { borderColor: colors.border }]} 
            onPress={() => setPatientSelectVisible(true)}
          >
            <Text style={{ color: newLabForm.patient_id ? colors.text : colors.textMuted }}>
              {newLabForm.patient_id ? patientsList.find(p => p.id === newLabForm.patient_id)?.first_name + ' ' + patientsList.find(p => p.id === newLabForm.patient_id)?.last_name : "Choose Patient"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>TEST TYPE *</Text>
          <TextInput
            style={[styles.pickerBtn, { color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. Malaria RDT, Blood Count"
            placeholderTextColor={colors.textMuted}
            value={newLabForm.test_type}
            onChangeText={(t) => setNewLabForm({...newLabForm, test_type: t})}
          />

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>RESULT SUMMARY *</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="Enter the lab findings/results here..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={newLabForm.summary}
            onChangeText={(t) => setNewLabForm({...newLabForm, summary: t})}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setNewLabModalVisible(false)} disabled={isUploading}>
              <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.accent }]} onPress={handleNewUpload} disabled={isUploading}>
              {isUploading ? <ActivityIndicator color="#0b0f19" /> : <Text style={[styles.submitBtnText, { color: '#0b0f19' }]}>Upload Data</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Patient Selector for Direct Upload */}
    <Modal visible={patientSelectVisible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
         <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '80%' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Patient</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {patientsList.map(p => (
                <TouchableOpacity 
                   key={p.id} 
                   style={{ paddingVertical: 15, borderBottomWidth: 1, borderColor: colors.border }}
                   onPress={() => {
                     setNewLabForm({...newLabForm, patient_id: p.id});
                     setPatientSelectVisible(false);
                   }}
                >
                   <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>{p.first_name} {p.last_name}</Text>
                   <Text style={{ color: colors.textMuted, fontSize: 12 }}>{p.id} • {p.phone || 'No phone'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setPatientSelectVisible(false)} style={{ padding: 15, alignItems: 'center' }}>
               <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
         </View>
      </View>
    </Modal>
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
  profileBtn: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl, flexWrap: 'wrap' },

  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  countBadge: { fontSize: 10, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  labCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  labInfo: { flex: 1 },
  patientName: { fontSize: fontSize.md, fontWeight: '700' },
  labTest: { fontSize: 11, fontWeight: '900', marginTop: 4, textTransform: 'uppercase' },
  date: { fontSize: 10, marginTop: 4 },
  
  actionBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyCard: { padding: spacing.xxl, borderRadius: borderRadius.xl, borderWidth: 1, alignItems: 'center' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: spacing.xl },
  modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: spacing.lg },
  selectedLabInfo: { marginBottom: spacing.xl, padding: spacing.md, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.03)' },
  patientNameModal: { fontSize: 18, fontWeight: '800' },
  testTypeModal: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginTop: 4 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 8, color: '#666' },
  input: { height: 120, borderWidth: 1, borderRadius: 15, padding: spacing.md, fontSize: 16, textAlignVertical: 'top', marginBottom: spacing.xl },
  modalActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  cancelBtn: { flex: 1, alignItems: 'center' },
  submitBtn: { flex: 2, height: 52, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },
  fab: { position: 'absolute', bottom: spacing.lg, right: spacing.lg, paddingHorizontal: spacing.lg, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 8 },
  fabText: { fontWeight: '900', letterSpacing: 1, fontSize: 12 },
  pickerBtn: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
});
