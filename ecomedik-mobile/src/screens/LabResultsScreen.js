import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, fontSize } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function LabResultsScreen({ navigation }) {
  const { colors } = useTheme();
  const [results, setResults] = useState([]);
  const [patients, setPatients] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    return navigation.addListener('focus', loadData);
  }, [navigation]);

  const loadData = async () => {
    try {
      // 1. Fetch lab results
      const { data: labs, error: lErr } = await supabase
        .from('lab_results')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (labs) {
        setResults(labs);
        
        // 2. Fetch patient names for these results
        const patientIds = [...new Set(labs.map(l => l.patient_id))];
        const { data: pData } = await supabase
          .from('patients')
          .select('id, first_name, last_name')
          .in('id', patientIds);

        if (pData) {
          const pMap = {};
          pData.forEach(p => pMap[p.id] = `${p.first_name} ${p.last_name}`);
          setPatients(pMap);
        }
      }
    } catch (error) {
      console.error('Error loading lab results:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('LabResultDetail', { 
        result: item, 
        patientName: patients[item.patient_id] 
      })}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconBox, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons name="flask" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.patientName, { color: colors.text }]}>
            {patients[item.patient_id] || item.patient_id}
          </Text>
          <Text style={[styles.testType, { color: colors.primary }]}>{item.test_type}</Text>
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {new Date(item.uploaded_at).toLocaleDateString()} • {new Date(item.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
      
      {!item.notified_at && (
        <View style={[styles.pendingBadge, { backgroundColor: colors.warning }]}>
          <Text style={styles.pendingText}>NEW</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Laboratory Records</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Comprehensive diagnostic log</Text>
      </View>

      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.textMuted} opacity={0.3} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No lab records found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '900' },
  subtitle: { fontSize: fontSize.sm, fontWeight: '600', marginTop: 4 },
  
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  resultCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientName: { fontSize: fontSize.md, fontWeight: '800' },
  testType: { fontSize: 11, fontWeight: '900', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  date: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  
  pendingBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomLeftRadius: 8,
  },
  pendingText: { color: '#FFF', fontSize: 8, fontWeight: '900' },
  
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: spacing.md, fontSize: fontSize.md, fontWeight: '600' },
});
