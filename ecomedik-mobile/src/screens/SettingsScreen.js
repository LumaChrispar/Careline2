import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, fontSize, borderRadius } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import useOutbreakStore from '../stores/outbreakStore';
import DatePickerModal from '../components/DatePickerModal';
import SelectModal from '../components/SelectModal';

const regions = ['South-West','North-West','Littoral','Centre','West','East','Far-North','North','Adamawa','South'];
const bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const genders = ['Male','Female','Other'];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { config, updateConfig } = useOutbreakStore();
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [localThreshold, setLocalThreshold] = useState(config.threshold.toString());
  const [localWindow, setLocalWindow] = useState(config.windowDays.toString());

  const [profile, setProfile] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    date_of_birth: new Date(1990, 0, 1),
    gender: 'Male', region: 'South-West', village: '',
    blood_group: 'O+', allergies: '', next_of_kin: '', facility_id: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectModal, setSelectModal] = useState({ visible: false, key: '', options: [], label: '' });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const userRole = user.user_metadata?.role || 'patient';
      setRole(userRole);

      if (userRole === 'patient') {
        const { data: p } = await supabase.from('patients').select('*').eq('auth_user_id', user.id).single();
        if (p) {
          setProfile({
            first_name: p.first_name || '', last_name: p.last_name || '',
            email: p.email || user.email || '', phone: p.phone || '',
            date_of_birth: p.date_of_birth ? new Date(p.date_of_birth) : new Date(1990, 0, 1),
            gender: p.gender || 'Male', region: p.region || 'South-West',
            village: p.village || '', blood_group: p.blood_group || 'O+',
            allergies: p.allergies || '', next_of_kin: p.next_of_kin || '',
            facility_id: p.facility_id || '',
          });
        }
      } else {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (prof) {
          setProfile(prev => ({
            ...prev,
            first_name: prof.name?.split(' ')[0] || '',
            last_name: prof.name?.split(' ').slice(1).join(' ') || '',
            email: prof.email || user.email || '',
            facility_id: prof.facility_id || '',
          }));
        }
      }
    } catch (error) { console.error('Error loading settings:', error); }
    finally { setIsLoading(false); }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (profile.email && profile.email !== user.email) {
        const { error: emailError } = await supabase.rpc('update_my_email', { new_email: profile.email });
        if (emailError) throw emailError;
      }
      if (role === 'patient') {
        const { error } = await supabase.from('patients').update({
          first_name: profile.first_name, last_name: profile.last_name,
          email: profile.email, phone: profile.phone,
          date_of_birth: profile.date_of_birth.toISOString().split('T')[0],
          gender: profile.gender, region: profile.region, village: profile.village,
          blood_group: profile.blood_group, allergies: profile.allergies,
          next_of_kin: profile.next_of_kin,
        }).eq('auth_user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles').update({
          name: `${profile.first_name} ${profile.last_name}`.trim(),
          email: profile.email, facility_id: profile.facility_id,
        }).eq('id', user.id);
        if (error) throw error;
        if (role === 'admin') updateConfig({ threshold: parseInt(localThreshold) || 20, windowDays: parseInt(localWindow) || 14 });
      }
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) { Alert.alert('Update Failed', error.message); }
    finally { setIsSaving(false); }
  };

  const openSelect = (key, options, label) => setSelectModal({ visible: true, key, options, label });
  const closeSelect = () => setSelectModal({ visible: false, key: '', options: [], label: '' });

  if (isLoading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const inputStyle = [styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }];
  const selectBtnStyle = [styles.selectBtn, { backgroundColor: colors.background, borderColor: colors.border }];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PERSONAL INFORMATION</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>First Name</Text>
            <TextInput style={inputStyle} value={profile.first_name} onChangeText={(v) => setProfile({...profile, first_name: v})} />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Last Name</Text>
            <TextInput style={inputStyle} value={profile.last_name} onChangeText={(v) => setProfile({...profile, last_name: v})} />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
          <TextInput style={inputStyle} value={profile.email} onChangeText={(v) => setProfile({...profile, email: v})} keyboardType="email-address" autoCapitalize="none" />
        </View>

        {role === 'patient' && (
          <>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
              <TextInput style={inputStyle} value={profile.phone} onChangeText={(v) => setProfile({...profile, phone: v})} keyboardType="phone-pad" />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Date of Birth</Text>
              <TouchableOpacity style={selectBtnStyle} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: colors.text, fontSize: 15 }}>{profile.date_of_birth.toDateString()}</Text>
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Gender</Text>
              <TouchableOpacity style={selectBtnStyle} onPress={() => openSelect('gender', genders, 'Gender')}>
                <Text style={{ color: colors.text, fontSize: 15 }}>{profile.gender}</Text>
                <Ionicons name="chevron-down-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Region</Text>
              <TouchableOpacity style={selectBtnStyle} onPress={() => openSelect('region', regions, 'Select Region')}>
                <Text style={{ color: colors.text, fontSize: 15 }}>{profile.region}</Text>
                <Ionicons name="chevron-down-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Village / Area</Text>
              <TextInput style={inputStyle} value={profile.village} onChangeText={(v) => setProfile({...profile, village: v})} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Blood Group</Text>
              <TouchableOpacity style={selectBtnStyle} onPress={() => openSelect('blood_group', bloodGroups, 'Blood Group')}>
                <Text style={{ color: colors.text, fontSize: 15 }}>{profile.blood_group}</Text>
                <Ionicons name="chevron-down-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Allergies</Text>
              <TextInput
                style={[inputStyle, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                value={profile.allergies}
                onChangeText={(v) => setProfile({...profile, allergies: v})}
                multiline
                placeholder="e.g. Penicillin, None"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Next of Kin</Text>
              <TextInput style={inputStyle} value={profile.next_of_kin} onChangeText={(v) => setProfile({...profile, next_of_kin: v})} />
            </View>
          </>
        )}
      </View>

      {role === 'admin' && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>OUTBREAK DETECTION</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Case Threshold</Text>
              <TextInput style={inputStyle} value={localThreshold} onChangeText={setLocalThreshold} keyboardType="numeric" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Detection Window (days)</Text>
              <TextInput style={inputStyle} value={localWindow} onChangeText={setLocalWindow} keyboardType="numeric" />
            </View>
          </View>
        </>
      )}

      <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSaveProfile} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>SAVE ALL CHANGES</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.logoutButton, { borderColor: colors.border }]} onPress={async () => await supabase.auth.signOut()}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} style={{ marginRight: 8 }} />
        <Text style={[styles.logoutText, { color: colors.danger }]}>LOG OUT</Text>
      </TouchableOpacity>

      <View style={{ height: 50 }} />

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        value={profile.date_of_birth}
        onConfirm={(date) => { setProfile({...profile, date_of_birth: date}); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
        colors={colors}
      />

      {/* Select Modal */}
      <SelectModal
        visible={selectModal.visible}
        options={selectModal.options}
        selected={profile[selectModal.key]}
        label={selectModal.label}
        onSelect={(val) => setProfile({...profile, [selectModal.key]: val})}
        onCancel={closeSelect}
        colors={colors}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', marginTop: spacing.xl, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: spacing.sm, marginLeft: 4 },
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, marginBottom: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.md },
  fieldGroup: { marginBottom: spacing.lg },
  label: { fontSize: 10, fontWeight: '700', marginBottom: 6, marginLeft: 2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15 },
  selectBtn: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  saveButton: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  saveButtonText: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 14 },
  logoutButton: { height: 52, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  logoutText: { fontSize: 14, fontWeight: '800' },
});
