import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, fontSize } from '../theme/theme';
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function AdminUserManagementScreen() {
  const { colors } = useTheme();
  const [users, setUsers] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('doctor');
  const [facilityId, setFacilityId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [profiles, facs] = await Promise.all([
        supabase.from('profiles').select('*').neq('role', 'patient').order('created_at', { ascending: false }),
        supabase.from('facilities').select('*'),
      ]);

      if (profiles.error) throw profiles.error;
      if (facs.error) throw facs.error;

      if (profiles.data) setUsers(profiles.data);
      if (facs.data) setFacilities(facs.data);
    } catch (err) {
      console.error('Error fetching staff data:', err.message);
      Alert.alert('Data Error', 'Could not load staff members: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!name || (!editingId && (!email || !password))) {
      Alert.alert('Required Fields', 'Please fill in all staff details.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('profiles').update({
          name, role, facility_id: facilityId
        }).eq('id', editingId);
        
        if (error) throw error;
        Alert.alert('Success', 'Personnel updated successfully.');
      } else {
        const { data, error } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }).auth.signUp({
          email,
          password,
          options: {
            data: { 
              name, 
              role, 
              facility_id: facilityId 
            }
          }
        });
        if (error) throw error;
        
        // Manual insert into profiles if trigger didn't fire or for immediate UI sync
        const { error: profErr } = await supabase.from('profiles').upsert({
          id: data.user.id,
          name,
          email,
          role,
          facility_id: facilityId
        });
        
        if (profErr) throw profErr;
        Alert.alert('Success', 'Staff account created. They can now login.');
      }
      setModalVisible(false);
      resetForm();
      fetchData();
    } catch (error) {
      Alert.alert('Operation Failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (userId) => {
    Alert.alert(
      'Remove Personnel',
      'Are you sure you want to delete this account? This action is permanent.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Permanently', 
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
            if (error) Alert.alert('Error', error.message);
            else fetchData();
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('doctor');
    setFacilityId('');
  };

  const openEdit = (user) => {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setFacilityId(user.facility_id || '');
    setModalVisible(true);
  };

  const renderUser = ({ item }) => (
    <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{item.email}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{item.role.toUpperCase()}</Text>
          </View>
          {item.facility_id && (
            <Text style={[styles.facilityText, { color: colors.textMuted }]}>
              • {facilities.find(f => f.id === item.facility_id)?.name || 'Health Facility'}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Personnel</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>User Management</Text>
        </View>
        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => { resetForm(); setModalVisible(true); }}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No staff members found.</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
               <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingId ? 'Edit Personnel' : 'Add New Staff'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                 <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>FULL NAME</Text>
              <TextInput 
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={name} onChangeText={setName} placeholder="e.g. Dr. Sarah Smith"
                placeholderTextColor={colors.textMuted}
              />

              {!editingId && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
                  <TextInput 
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={email} onChangeText={setEmail} placeholder="staff@hospital.com"
                    autoCapitalize="none" keyboardType="email-address"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.label, { color: colors.textSecondary }]}>TEMPORARY PASSWORD</Text>
                  <TextInput 
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={password} onChangeText={setPassword} placeholder="••••••••"
                    secureTextEntry
                    placeholderTextColor={colors.textMuted}
                  />
                </>
              )}

              <Text style={[styles.label, { color: colors.textSecondary }]}>SYSTEM ROLE</Text>
              <View style={styles.rolePicker}>
                {['doctor', 'labtech', 'receptionist', 'admin'].map(r => (
                  <TouchableOpacity 
                    key={r}
                    style={[
                      styles.roleBtn, 
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      role === r && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[styles.roleBtnText, { color: role === r ? '#FFF' : colors.textSecondary }]}>
                      {r.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>HOSPITAL ASSIGNMENT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.facPicker}>
                 {facilities.map(f => (
                   <TouchableOpacity 
                    key={f.id}
                    style={[
                      styles.facBtn, 
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      facilityId === f.id && { backgroundColor: colors.accent, borderColor: colors.accent }
                    ]}
                    onPress={() => setFacilityId(f.id)}
                   >
                     <Text style={[styles.facBtnText, { color: facilityId === f.id ? '#FFF' : colors.text }]}>
                       {f.name}
                     </Text>
                   </TouchableOpacity>
                 ))}
              </ScrollView>
              
              <View style={{ height: 40 }} />
            </ScrollView>

            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateOrUpdate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>{editingId ? 'SAVE CHANGES' : 'CREATE STAFF ACCOUNT'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
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
  addBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  
  list: { paddingBottom: 40 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700' },
  userEmail: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '900' },
  facilityText: { fontSize: 11, marginLeft: 8, fontWeight: '600' },
  
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { textAlign: 'center', marginTop: 12, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: spacing.xl, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  form: { flex: 1 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8, marginTop: spacing.md },
  input: { height: 56, borderWidth: 1, borderRadius: 15, paddingHorizontal: spacing.md, fontSize: 16 },
  
  rolePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  roleBtnText: { fontSize: 10, fontWeight: '900' },

  facPicker: { flexDirection: 'row', marginTop: 4 },
  facBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, marginRight: 8 },
  facBtnText: { fontSize: 12, fontWeight: '700' },

  submitBtn: { height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  submitBtnText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },
});
