import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, fontSize } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function LabResultDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { result, patientName } = route.params;
  const [role, setRole] = useState(null);
  const [reviewed, setReviewed] = useState(Boolean(result?.notified_at));
  const [saving, setSaving] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setRole(data.user?.user_metadata?.role)); }, []);
  const acknowledge = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('lab_results').update({ notified_at: new Date().toISOString() }).eq('id', result.id).select().single();
      if (error) throw error;
      setReviewed(true);
    } catch (error) { Alert.alert('Could not mark as reviewed', error.message); }
    finally { setSaving(false); }
  };

  if (!result) return null;

  const handleOpenDocument = () => {
    if (result.file_url) {
      Linking.openURL(result.file_url).catch((err) =>
        console.error('An error occurred', err)
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lab Report</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {reviewed ? <Text style={{ color: colors.accent, marginBottom: 16 }}>Reviewed by clinician</Text> : ['admin', 'doctor'].includes(role) && <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={acknowledge} style={{ padding: 16, borderRadius: 12, backgroundColor: colors.primary, marginBottom: 16 }}><Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>{saving ? 'Saving…' : 'Mark as reviewed'}</Text></TouchableOpacity>}
        {/* Main Info Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="flask" size={32} color={colors.primary} />
            </View>
            <View style={styles.testInfo}>
              <Text style={[styles.testType, { color: colors.text }]}>{result.test_type}</Text>
              <Text style={[styles.labId, { color: colors.textMuted }]}>ID: {result.id}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>PATIENT</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{patientName || result.patient_id}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>DATE UPLOADED</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(result.uploaded_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Observations & Summary</Text>
          <View style={[styles.summaryBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {result.summary || 'No detailed summary provided for this lab result.'}
            </Text>
          </View>
        </View>

        {/* File Section */}
        {result.file_url ? (
          <View style={[styles.fileCard, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30' }]}>
            <View style={styles.fileIconRow}>
              <View style={[styles.fileIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="document-text" size={30} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fileTitle, { color: colors.text }]}>Diagnostic Document</Text>
                <Text style={[styles.fileSubtitle, { color: colors.textMuted }]}>PDF / IMAGE REPORT</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.downloadButton, { backgroundColor: colors.accent }]}
              onPress={handleOpenDocument}
            >
              <Ionicons name="cloud-download" size={20} color="#FFF" />
              <Text style={styles.downloadButtonText}>VIEW FULL REPORT</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.emptyFileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="document-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyFileText, { color: colors.textMuted }]}>No digital attachment available.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 100,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  headerTitle: { color: '#FFF', fontSize: fontSize.lg, fontWeight: '800' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  testInfo: { flex: 1 },
  testType: { fontSize: fontSize.xl, fontWeight: '900' },
  labId: { fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: spacing.lg },
  
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  infoValue: { fontSize: fontSize.md, fontWeight: '700' },
  
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800', marginBottom: spacing.md },
  summaryBox: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  summaryText: { fontSize: fontSize.md, lineHeight: 24, fontStyle: 'italic' },
  
  fileCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
  },
  fileIconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  fileIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  fileTitle: { fontSize: fontSize.md, fontWeight: '700' },
  fileSubtitle: { fontSize: 9, fontWeight: '800', marginTop: 2 },
  
  downloadButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  downloadButtonText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  
  emptyFileCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyFileText: { marginTop: spacing.md, fontSize: fontSize.sm, fontWeight: '600' },
});
