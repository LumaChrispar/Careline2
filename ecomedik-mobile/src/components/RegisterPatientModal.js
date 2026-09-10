import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import { spacing, borderRadius } from '../theme/theme';
import DatePickerModal from './DatePickerModal';
import SelectModal from './SelectModal';

const regions = ['South-West','North-West','Littoral','Centre','West','East','Far-North','North','Adamawa','South'];
const bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const genders = ['Male','Female','Other'];

export default function RegisterPatientModal({ visible, onClose, onRegister, colors }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', password: '',
    date_of_birth: new Date(1990, 0, 1),
    gender: 'Male', village: '', region: 'South-West', blood_group: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectModal, setSelectModal] = useState({ visible: false, key: '', options: [], label: '' });

  const openSelect = (key, options, label) => setSelectModal({ visible: true, key, options, label });
  const closeSelect = () => setSelectModal({ visible: false, key: '', options: [], label: '' });

  const handleRegister = async () => {
    if (!form.first_name || !form.last_name) {
      Alert.alert('Required Fields', 'First and Last name are required.');
      return;
    }
    if (isSubmitting) return;
    if (form.password && (!form.phone.trim() || form.password.length < 6)) { Alert.alert('Portal access', 'Enter a phone number and a password of at least 6 characters.'); return; }
    if (form.date_of_birth > new Date()) { Alert.alert('Date of birth', 'Date of birth cannot be in the future.'); return; }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const facility_id = user?.user_metadata?.facility_id || null;
      if (form.password) {
        // Creating an authenticated user via a detached client so the receptionist stays logged in.
        // The Postgres handle_new_patient trigger will automatically populate the patient row.
        const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        
        const { data: authData, error: authError } = await authClient.auth.signUp({
          email: `${form.phone.replace(/[^0-9]/g, '')}@patient.eco-medic.local`,
          password: form.password,
          options: {
            data: {
              role: 'patient',
              facility_id,
              first_name: form.first_name,
              last_name: form.last_name,
              phone: form.phone || null,
              date_of_birth: form.date_of_birth.toISOString().split('T')[0],
              gender: form.gender,
              village: form.village,
              region: form.region,
              blood_group: form.blood_group || null,
            }
          }
        });
        
        if (authError) throw authError;

        // Give the database trigger a moment to successfully populate row
        await new Promise(r => setTimeout(r, 600));

        const { data: patientData } = await supabase.from('patients').select('*').eq('auth_user_id', authData.user.id).single();
        if (patientData) {
          Alert.alert('Success', `Patient ${patientData.id} registered and account created.`);
          onRegister(patientData);
          onClose();
          setForm({ first_name: '', last_name: '', phone: '', password: '', date_of_birth: new Date(1990, 0, 1), gender: 'Male', village: '', region: 'South-West', blood_group: 'O+' });
          return;
        }
      }

      if (form.password) throw new Error('Account created, but the patient record could not be loaded. Refresh the directory before retrying.');

      // Standard Unauthenticated Patient Creation Flow
      const { data, error } = await supabase
        .from('patients')
        .insert([{
          facility_id,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone || null,
          date_of_birth: form.date_of_birth.toISOString().split('T')[0],
          gender: form.gender,
          village: form.village,
          region: form.region,
          blood_group: form.blood_group || null,
        }])
        .select()
        .single();
        
      if (error) throw error;
      Alert.alert('Success', `Patient ${data.id} registered without account login.`);
      onRegister(data);
      onClose();
      setForm({ first_name: '', last_name: '', phone: '', password: '', date_of_birth: new Date(1990, 0, 1), gender: 'Male', village: '', region: 'South-West', blood_group: 'O+' });
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectBtnStyle = [styles.selectBtn, { backgroundColor: colors.background, borderColor: colors.border }];
  const inputStyle = [styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }];

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.content, { backgroundColor: colors.surface }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>New Patient</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>FIRST NAME *</Text>
                <TextInput style={inputStyle} value={form.first_name} onChangeText={(v) => setForm({...form, first_name: v})} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>LAST NAME *</Text>
                <TextInput style={inputStyle} value={form.last_name} onChangeText={(v) => setForm({...form, last_name: v})} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>PHONE NUMBER</Text>
                <TextInput style={inputStyle} value={form.phone} onChangeText={(v) => setForm({...form, phone: v})} keyboardType="phone-pad" />
              </View>
              
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>CREATE PASSWORD (OPTIONAL)</Text>
                <TextInput style={inputStyle} value={form.password} onChangeText={(v) => setForm({...form, password: v})} secureTextEntry placeholder="To grant app access" placeholderTextColor={colors.textMuted} />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>DATE OF BIRTH</Text>
                <TouchableOpacity style={selectBtnStyle} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: colors.text, fontSize: 15 }}>{form.date_of_birth.toDateString()}</Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>GENDER</Text>
                <TouchableOpacity style={selectBtnStyle} onPress={() => openSelect('gender', genders, 'Gender')}>
                  <Text style={{ color: colors.text, fontSize: 15 }}>{form.gender}</Text>
                  <Ionicons name="chevron-down-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>REGION</Text>
                <TouchableOpacity style={selectBtnStyle} onPress={() => openSelect('region', regions, 'Select Region')}>
                  <Text style={{ color: colors.text, fontSize: 15 }}>{form.region}</Text>
                  <Ionicons name="chevron-down-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>VILLAGE / AREA</Text>
                <TextInput style={inputStyle} value={form.village} onChangeText={(v) => setForm({...form, village: v})} />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>BLOOD GROUP</Text>
                <TouchableOpacity style={selectBtnStyle} onPress={() => openSelect('blood_group', bloodGroups, 'Blood Group')}>
                  <Text style={{ color: colors.text, fontSize: 15 }}>{form.blood_group}</Text>
                  <Ionicons name="chevron-down-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleRegister} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>REGISTER PATIENT</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={showDatePicker}
        value={form.date_of_birth}
        onConfirm={(date) => { setForm({...form, date_of_birth: date}); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
        colors={colors}
      />

      <SelectModal
        visible={selectModal.visible}
        options={selectModal.options}
        selected={form[selectModal.key]}
        label={selectModal.label}
        onSelect={(val) => setForm({...form, [selectModal.key]: val})}
        onCancel={closeSelect}
        colors={colors}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, maxHeight: '92%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  title: { fontSize: 24, fontWeight: '900' },
  fieldGroup: { marginBottom: spacing.lg },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  selectBtn: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  submitBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  submitText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },
});
