import React, { useState, useEffect } from 'react'; 
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, fontSize } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function BroadcastsScreen() {
  const { colors } = useTheme();
  const [broadcasts, setBroadcasts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [targetType, setTargetType] = useState('all');
  const [targetRole, setTargetRole] = useState('doctor');
  const [targetUserId, setTargetUserId] = useState(null);
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    fetchBroadcasts();
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .neq('role', 'patient')
        .order('name');
      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const fetchBroadcasts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBroadcasts(data || []);
    } catch (err) {
      console.error('Error fetching broadcasts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    if (targetType === 'individual' && !targetUserId) {
      Alert.alert('Required', 'Please select a staff member for individual broadcast.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('staff_broadcasts').insert({
        content: content.trim(),
        priority,
        target_type: targetType,
        target_role: targetType === 'role' ? targetRole : null,
        target_user_id: targetType === 'individual' ? targetUserId : null,
        author_id: user.id,
        author_name: user.user_metadata?.name || 'Staff Member',
      });

      if (error) throw error;
      
      setModalVisible(false);
      setContent('');
      setPriority('normal');
      setTargetType('all');
      setTargetUserId(null);
      fetchBroadcasts();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[
      styles.card, 
      { backgroundColor: colors.surface, borderColor: colors.border }, 
      item.priority === 'urgent' && { borderLeftColor: colors.danger, borderLeftWidth: 4 }
    ]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.author, { color: colors.textSecondary }]}>{item.author_name}</Text>
          <Text style={[styles.targetLabel, { color: colors.primary }]}>
            {item.target_type === 'all' ? '📢 ALL STAFF' : item.target_type === 'role' ? `👥 ALL ${item.target_role?.toUpperCase()}S` : '👤 PRIVATE'}
          </Text>
        </View>
        <Text style={[styles.time, { color: colors.textMuted }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.content, { color: colors.text }]}>{item.content}</Text>
      {item.priority === 'urgent' && (
        <View style={styles.urgentBadge}>
           <Ionicons name="alert-circle" size={12} color={colors.danger} />
           <Text style={[styles.urgentText, { color: colors.danger }]}>URGENT</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Notice Board</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Staff Announcements</Text>
        </View>
        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="megaphone" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={colors.primary} />
      ) : (
        <FlatList
          data={broadcasts}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>No announcements yet.</Text>}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'flex-end'}}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Announcement</Text>
            
            <Text style={[styles.label, { color: colors.textSecondary }]}>CONTENT</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Write something to the staff..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={content}
              onChangeText={setContent}
            />
            
            <Text style={[styles.label, { color: colors.textSecondary }]}>PRIORITY</Text>
            <View style={styles.priorityRow}>
              {['normal', 'urgent'].map(p => (
                <TouchableOpacity 
                  key={p} 
                  style={[
                    styles.priorityBtn, 
                    { borderColor: colors.border }, 
                    priority === p && { backgroundColor: p === 'urgent' ? colors.danger : colors.primary, borderColor: p === 'urgent' ? colors.danger : colors.primary }
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityText, { color: priority === p ? '#FFF' : colors.textMuted }]}>{p.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>TARGET AUDIENCE</Text>
            <View style={styles.targetRow}>
              {['all', 'role', 'individual'].map(t => (
                <TouchableOpacity 
                  key={t} 
                  style={[styles.targetBtn, { borderColor: colors.border }, targetType === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setTargetType(t)}
                >
                  <Text style={[styles.targetText, { color: targetType === t ? '#FFF' : colors.textMuted }]}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {targetType === 'role' && (
              <View style={styles.subTargetRow}>
                {['admin', 'doctor', 'receptionist', 'labtech'].map(r => (
                  <TouchableOpacity 
                    key={r} 
                    style={[styles.subTargetBtn, { borderColor: colors.border }, targetRole === r && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                    onPress={() => setTargetRole(r)}
                  >
                    <Text style={[styles.subTargetText, { color: targetRole === r ? '#000' : colors.textMuted }]}>{r.substring(0,3).toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {targetType === 'individual' && (
              <View style={[styles.staffPickerContainer, { borderColor: colors.border }]}>
                <FlatList
                  data={staff}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={[styles.staffToken, { backgroundColor: targetUserId === item.id ? colors.accent : colors.background }]}
                      onPress={() => setTargetUserId(item.id)}
                    >
                      <Text style={[styles.staffTokenText, { color: targetUserId === item.id ? '#000' : colors.text }]}>{item.name}</Text>
                      <Text style={[styles.staffTokenRole, { color: targetUserId === item.id ? '#000' : colors.textMuted }]}>{item.role}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitBtn, { backgroundColor: colors.primary }]} 
                onPress={handlePost}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Broadcast</Text>}
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  addBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  list: { paddingBottom: 40 },
  card: { padding: spacing.lg, borderRadius: borderRadius.xl, borderWidth: 1, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  author: { fontSize: 13, fontWeight: '800' },
  time: { fontSize: 11 },
  targetLabel: { fontSize: 8, fontWeight: '900', marginTop: 2 },
  content: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  urgentText: { fontSize: 9, fontWeight: '900' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: spacing.lg },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 8, color: '#666' },
  input: { height: 80, borderWidth: 1, borderRadius: 15, padding: spacing.md, fontSize: 16, textAlignVertical: 'top', marginBottom: spacing.lg },
  
  priorityRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  priorityBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  priorityText: { fontSize: 11, fontWeight: '800' },

  targetRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  targetBtn: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  targetText: { fontSize: 10, fontWeight: '800' },

  subTargetRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  subTargetBtn: { flex: 1, height: 30, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  subTargetText: { fontSize: 9, fontWeight: '900' },

  staffPickerContainer: { height: 60, marginBottom: 16 },
  staffToken: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  staffTokenText: { fontSize: 11, fontWeight: '800' },
  staffTokenRole: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase' },

  modalActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginTop: spacing.md },
  cancelBtn: { flex: 1, alignItems: 'center' },
  submitBtn: { flex: 2, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },
  empty: { textAlign: 'center', marginTop: 100, fontSize: 14, fontWeight: '600' },
});
