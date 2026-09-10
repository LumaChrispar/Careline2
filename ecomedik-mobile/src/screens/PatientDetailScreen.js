import React, { useState, useEffect } from 'react'; 
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DatePickerModal from '../components/DatePickerModal';
import SelectModal from '../components/SelectModal';

const regions = ['South-West','North-West','Littoral','Centre','West','East','Far-North','North','Adamawa','South'];
const bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const genders = ['Male','Female','Other'];

export default function PatientDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { patientId } = route.params;
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [labs, setLabs] = useState([]);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectModal, setSelectModal] = useState({ visible: false, key: '', options: [], label: '' });

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchPatientData);
    fetchPatientData();
    return unsubscribe;
  }, [patientId, navigation]);

  const fetchPatientData = async () => {
    setIsLoading(true);
    try {
      const [pRes, vRes, lRes] = await Promise.all([
        supabase.from('patients').select('*').eq('id', patientId).single(),
        supabase.from('visits').select('*').eq('patient_id', patientId).order('date', { ascending: false }),
        supabase.from('lab_results').select('*').eq('patient_id', patientId).order('uploaded_at', { ascending: false }),
      ]);
      if (pRes.data) {
        setPatient(pRes.data);
        setEditForm({ ...pRes.data, date_of_birth: pRes.data.date_of_birth ? new Date(pRes.data.date_of_birth) : new Date(1990, 0, 1) });
      }
      if (vRes.data) setVisits(vRes.data);
      if (lRes.data) setLabs(lRes.data);
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.role) setRole(user.user_metadata.role);
    } catch (err) { console.error('Error fetching patient details:', err); }
    finally { setIsLoading(false); }
  };

  const handleDeletePatient = () => {
    Alert.alert('Verify Deletion', 'Are you sure you want to permanently delete this patient record and all related data?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setIsLoading(true);
        try {
          const { error } = await supabase.rpc('staff_delete_patient', { target_patient_id: patientId });
          if (error) throw error;
          Alert.alert('Success', 'Patient deleted successfully.');
          navigation.goBack();
        } catch (error) {
          Alert.alert('Delete Failed', error.message);
          setIsLoading(false);
        }
      }}
    ])
  };

  const handleUpdatePatient = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('patients').update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        date_of_birth: editForm.date_of_birth.toISOString().split('T')[0],
        gender: editForm.gender,
        blood_group: editForm.blood_group,
        allergies: editForm.allergies,
        village: editForm.village,
        region: editForm.region,
      }).eq('id', patientId);
      if (error) throw error;
      Alert.alert('Success', 'Patient records updated.');
      setIsEditModalVisible(false);
      fetchPatientData();
    } catch (error) { Alert.alert('Update Failed', error.message); }
    finally { setIsUpdating(false); }
  };

  const openSelect = (key, options, label) => setSelectModal({ visible: true, key, options, label });
  const closeSelect = () => setSelectModal({ visible: false, key: '', options: [], label: '' });

  if (isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!patient) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Patient not found.</Text></View>;

  const isStaff = ['admin','doctor','receptionist'].includes(role);
  const inputStyle = [styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }];
  const selectBtnStyle = [styles.selectBtn, { borderColor: colors.border, backgroundColor: colors.background }];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{patient.first_name} {patient.last_name}</Text>
          {isStaff && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setIsEditModalVisible(true)} style={styles.editBtn}>
                <Ionicons name="create-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeletePatient} style={styles.editBtn}>
                <Ionicons name="trash-outline" size={22} color={colors.danger || '#ef4444'} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Patient Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{patient.first_name.charAt(0)}</Text>
            </View>
            <View>
              <Text style={[styles.patientId, { color: colors.primary }]}>{patient.id}</Text>
              <Text style={[styles.patientMeta, { color: colors.textMuted }]}>
                {patient.gender} • {patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : '?'} yrs
              </Text>
            </View>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>BLOOD GROUP</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{patient.blood_group || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>PHONE</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{patient.phone || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textMuted}]}>LOCATION</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{[patient.village, patient.region].filter(Boolean).join(', ') || 'N/A'}</Text>
            </View>
          </View>
          {patient.allergies ? (
            <View style={[styles.allergiesBox, { backgroundColor: colors.danger + '10' }]}>
              <Ionicons name="warning" size={16} color={colors.danger} />
              <Text style={[styles.allergiesText, { color: colors.danger }]}>ALLERGIES: {patient.allergies}</Text>
            </View>
          ) : null}
        </View>

        {/* Visits */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>VISIT HISTORY</Text>
        {visits.length === 0 ? <Text style={{ color: colors.textMuted, marginLeft: 4, marginBottom: spacing.xl }}>No visit records found.</Text>
          : visits.map(v => (
          <View key={v.id} style={[styles.visitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.visitHeader}>
              <Text style={[styles.visitDate, { color: colors.textMuted }]}>{new Date(v.date).toLocaleDateString()}</Text>
              <Text style={[styles.visitDoctor, { color: colors.primary }]}>Dr. ID: {v.attending_doctor?.slice(0, 8)}</Text>
            </View>
            <Text style={[styles.diagnosis, { color: colors.text }]}>{v.diagnosis || 'General Consultation'}</Text>
            <View style={styles.symptomRow}>
              {(v.symptoms || []).map(s => (
                <View key={s} style={[styles.symptomBadge, { backgroundColor: colors.background }]}>
                  <Text style={[styles.symptomText, { color: colors.textMuted }]}>{s}</Text>
                </View>
              ))}
            </View>
            {v.prescription && (
              <View style={styles.prescriptionBox}>
                <Ionicons name="medkit-outline" size={14} color={colors.accent} />
                <Text style={[styles.prescriptionText, { color: colors.textSecondary }]}>{v.prescription}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Lab Reports */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.xl }]}>LAB REPORTS</Text>
        {labs.length === 0 ? <Text style={{ color: colors.textMuted, marginLeft: 4 }}>No lab reports found.</Text>
          : labs.map(l => (
          <TouchableOpacity key={l.id} style={[styles.labCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('LabResultDetail', { result: l, patientName: `${patient.first_name} ${patient.last_name}` })}>
            <View style={[styles.labIcon, { backgroundColor: (colors.accent || '#0ea5e9') + '15' }]}>
              <Ionicons name="flask" size={20} color={colors.accent || '#0ea5e9'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.labTitle, { color: colors.text }]}>{l.test_type}</Text>
              <Text style={[styles.labDate, { color: colors.textMuted }]}>{new Date(l.uploaded_at).toLocaleDateString()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB */}
      {isStaff && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('AddVisit', { patientId: patient.id, patientName: `${patient.first_name} ${patient.last_name}` })}>
          <Ionicons name="add" size={28} color="#FFF" />
          <Text style={styles.fabText}>RECORD VISIT</Text>
        </TouchableOpacity>
      )}

      {/* Edit Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Patient Record</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>FIRST NAME</Text>
                <TextInput style={inputStyle} value={editForm.first_name} onChangeText={(v) => setEditForm({...editForm, first_name: v})} />
              </View>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>LAST NAME</Text>
                <TextInput style={inputStyle} value={editForm.last_name} onChangeText={(v) => setEditForm({...editForm, last_name: v})} />
              </View>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>PHONE</Text>
                <TextInput style={inputStyle} value={editForm.phone} onChangeText={(v) => setEditForm({...editForm, phone: v})} keyboardType="phone-pad" />
              </View>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>DATE OF BIRTH</Text>
                <TouchableOpacity style={selectBtnStyle} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: colors.text }}>{editForm.date_of_birth?.toDateString()}</Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>GENDER</Text>
                <TouchableOpacity style={selectBtnStyle} onPress={() => openSelect('gender', genders, 'Gender')}>
                  <Text style={{ color: colors.text }}>{editForm.gender}</Text>
                  <Ionicons name="chevron-down-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>REGION</Text>
                <TouchableOpacity style={selectBtnStyle} onPress={() => openSelect('region', regions, 'Select Region')}>
                  <Text style={{ color: colors.text }}>{editForm.region}</Text>
                  <Ionicons name="chevron-down-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>BLOOD GROUP</Text>
                <TouchableOpacity style={selectBtnStyle} onPress={() => openSelect('blood_group', bloodGroups, 'Blood Group')}>
                  <Text style={{ color: colors.text }}>{editForm.blood_group}</Text>
                  <Ionicons name="chevron-down-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>ALLERGIES</Text>
                <TextInput style={[inputStyle, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={editForm.allergies} onChangeText={(v) => setEditForm({...editForm, allergies: v})} multiline />
              </View>
              <TouchableOpacity style={[styles.updateBtn, { backgroundColor: colors.primary }]} onPress={handleUpdatePatient} disabled={isUpdating}>
                {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.updateBtnText}>UPDATE RECORD</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date and Select modals (rendered outside the main Modal) */}
      <DatePickerModal
        visible={showDatePicker}
        value={editForm.date_of_birth || new Date(1990, 0, 1)}
        onConfirm={(date) => { setEditForm({...editForm, date_of_birth: date}); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
        colors={colors}
      />
      <SelectModal
        visible={selectModal.visible}
        options={selectModal.options}
        selected={editForm[selectModal.key]}
        label={selectModal.label}
        onSelect={(val) => setEditForm({...editForm, [selectModal.key]: val})}
        onCancel={closeSelect}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg, gap: 12 },
  title: { fontSize: 20, fontWeight: '900', flex: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  editBtn: { padding: 8 },
  profileCard: { padding: spacing.lg, borderRadius: borderRadius.xl, borderWidth: 1, marginBottom: spacing.xl },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '900' },
  patientId: { fontSize: 18, fontWeight: '900' },
  patientMeta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  detailsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  detailValue: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  allergiesBox: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 10, gap: 8 },
  allergiesText: { fontSize: 11, fontWeight: '900' },
  sectionTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5, marginBottom: spacing.md, marginLeft: 4 },
  visitCard: { padding: spacing.lg, borderRadius: borderRadius.xl, borderWidth: 1, marginBottom: spacing.md },
  visitHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  visitDate: { fontSize: 11, fontWeight: '700' },
  visitDoctor: { fontSize: 10, fontWeight: '900' },
  diagnosis: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  symptomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  symptomBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  symptomText: { fontSize: 10, fontWeight: '700' },
  prescriptionBox: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.8 },
  prescriptionText: { fontSize: 12, fontStyle: 'italic' },
  labCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, marginBottom: spacing.sm, gap: 12 },
  labIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  labTitle: { fontSize: 14, fontWeight: '700' },
  labDate: { fontSize: 11, marginTop: 2 },
  fab: { position: 'absolute', bottom: spacing.lg, right: spacing.lg, paddingHorizontal: spacing.lg, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 8 },
  fabText: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalField: { marginBottom: spacing.lg },
  modalLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  modalInput: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 16 },
  selectBtn: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  updateBtn: { height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  updateBtnText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
