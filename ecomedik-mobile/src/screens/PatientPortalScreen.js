import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, fontSize } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

const { width } = Dimensions.get('window');

export default function PatientPortalScreen({ navigation }) {
  const { colors } = useTheme();
  const [profile, setProfile] = useState(null);
  const [visits, setVisits] = useState([]);
  const [labs, setLabs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch patient profile
      const { data: p, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (p) {
        setProfile(p);

        // 2. Fetch visits
        const { data: v } = await supabase
          .from('visits')
          .select('*')
          .eq('patient_id', p.id)
          .order('date', { ascending: false });
        if (v) setVisits(v);

        // 3. Fetch lab results
        const { data: l } = await supabase
          .from('lab_results')
          .select('*')
          .eq('patient_id', p.id)
          .order('uploaded_at', { ascending: false });
        if (l) setLabs(l);
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadPatientData();
  };

  const saveQR = async (qrUrl) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'I need your permission to save the QR code to your device gallery.');
        return;
      }

      const fileUri = FileSystem.cacheDirectory + `EcoMedik_QR_${profile.id}.png`;
      const downloadResult = await FileSystem.downloadAsync(qrUrl, fileUri);
      
      if (downloadResult.status === 200) {
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        Alert.alert('Success', 'QR Code saved to your gallery! You can now print it or show it at the hospital.');
      } else {
        throw new Error('QR download failed.');
      }
    } catch (error) {
      Alert.alert('Download Error', 'Could not save the QR code. Please try again.');
      console.error(error);
    }
  };

  const shareQR = async (qrUrl) => {
    try {
      const fileUri = FileSystem.cacheDirectory + `EcoMedik_QR_${profile.id}.png`;
      const downloadResult = await FileSystem.downloadAsync(qrUrl, fileUri);
      if (downloadResult.status === 200) {
        await Sharing.shareAsync(downloadResult.uri);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const exportHistoryAsPDF = async () => {
    try {
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1a1a1a; }
              .header { text-align: center; border-bottom: 2px solid #00f2fe; padding-bottom: 20px; margin-bottom: 30px; }
              h1 { margin: 0; color: #000; font-size: 28px; }
              .patient-meta { display: flex; justify-content: space-between; margin-bottom: 30px; padding: 15px; background: #f8fafc; border-radius: 8px; }
              .section-title { font-size: 18px; font-weight: bold; border-left: 4px solid #00f2fe; padding-left: 10px; margin: 30px 0 15px 0; background: #f1f5f9; padding-vertical: 8px; }
              .visit { margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; }
              .visit-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px; color: #64748b; }
              .diagnosis { font-size: 16px; color: #0f172a; margin-bottom: 8px; }
              .prescription { font-style: italic; color: #0891b2; margin-top: 10px; padding: 10px; background: #ecfeff; border-radius: 4px; border-left: 3px solid #06b6d4; }
              .lab { padding: 12px; border-bottom: 1px solid #f1f5f9; }
              .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>ECO~MEDIK MEDICAL LOG</h1>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="patient-meta">
              <div>
                <p><strong>Name:</strong> ${profile.first_name} ${profile.last_name}</p>
                <p><strong>Patient ID:</strong> ${profile.id}</p>
              </div>
              <div style="text-align: right">
                <p><strong>Blood Group:</strong> ${profile.blood_group || 'N/A'}</p>
                <p><strong>Gender:</strong> ${profile.gender}</p>
              </div>
            </div>

            <div class="section-title">Medical History & Visits</div>
            ${visits.length === 0 ? '<p>No medical visits recorded yet.</p>' : visits.map(v => `
              <div class="visit">
                <div class="visit-header">
                  <span>${new Date(v.date).toLocaleDateString()}</span>
                  <span>${v.diagnosis ? 'DIAGNOSED' : 'CHECKUP'}</span>
                </div>
                <div class="diagnosis">${v.diagnosis || 'General Examination'}</div>
                ${v.symptoms ? `<p><strong>Symptoms:</strong> ${v.symptoms.join(', ')}</p>` : ''}
                ${v.prescription ? `<div class="prescription">Prescribed: ${v.prescription}</div>` : ''}
              </div>
            `).join('')}

            <div class="section-title">Laboratory Reports</div>
            ${labs.length === 0 ? '<p>No lab records found.</p>' : labs.map(l => `
              <div class="lab">
                <strong>${l.test_type}</strong> - ${new Date(l.uploaded_at).toLocaleDateString()}
                <p>${l.summary || 'Summary pending.'}</p>
              </div>
            `).join('')}

            <div class="footer">
              <p>This is a digitally generated medical record from the ECO~MEDIK Hospital Network.</p>
            </div>
          </body>
        </html>
      `;

      await Print.printAsync({ html });
    } catch (error) {
      Alert.alert('Export Error', 'Could not generate medical log PDF.');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading your medical records...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Profile not found.</Text>
      </View>
    );
  }

  const age = profile.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : 'N/A';

  const qrData = encodeURIComponent(`ECOMEDIK_QR:${profile.id}:${profile.first_name} ${profile.last_name}:${profile.blood_group || 'Unknown'}`);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header with Refresh Button */}
      <View style={styles.topHeader}>
        <Text style={[styles.mainTitle, { color: colors.text }]}>Patient Portal</Text>
        <TouchableOpacity onPress={onRefresh} style={[styles.inlineRefresh, { backgroundColor: colors.surface, borderColor: colors.border }]}>
           <Ionicons name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {/* Header / Profile Summary */}
      <LinearGradient
        colors={colors.gradientHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCard}
      >
        <View style={styles.headerInfo}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.avatarText}>
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{profile.first_name} {profile.last_name}</Text>
            <View style={styles.idBadge}>
              <Text style={styles.idText}>{profile.id}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.userSubInfo}>
          {profile.gender || 'Unknown'}, {age} Years • {profile.village || 'N/A'}, {profile.region || 'N/A'}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>BLOOD GROUP</Text>
            <Text style={styles.statValue}>{profile.blood_group || 'N/A'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>ALLERGIES</Text>
            <Text style={[styles.statValue, { color: colors.dangerLight }]}>{profile.allergies || 'NONE'}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Emergency QR */}
      <View style={[styles.qrCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.qrHeader}>
          <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
          <Text style={[styles.qrTitle, { color: colors.textSecondary }]}>EMERGENCY QR ACCESS</Text>
        </View>
        <View style={styles.qrContainer}>
          <Image
            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${qrData}&color=000&bgcolor=fff` }}
            style={styles.qrImage}
          />
        </View>
        <View style={styles.qrActionRow}>
          <TouchableOpacity 
            style={[styles.qrActionBtn, { backgroundColor: colors.surfaceLight }]}
            onPress={() => saveQR(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${qrData}&color=000&bgcolor=fff`)}
          >
            <Ionicons name="download-outline" size={20} color={colors.primary} />
            <Text style={[styles.qrActionText, { color: colors.text }]}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.qrActionBtn, { backgroundColor: colors.surfaceLight }]}
            onPress={exportHistoryAsPDF}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={[styles.qrActionText, { color: colors.text }]}>PDF Log</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.qrActionBtn, { backgroundColor: colors.surfaceLight }]}
            onPress={() => shareQR(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${qrData}&color=000&bgcolor=fff`)}
          >
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.qrHint, { color: colors.textMuted }]}>
          Allow doctors to scan this to view your life-saving medical data instantly.
        </Text>
      </View>

      {/* Recent Visits */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={24} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Medical History</Text>
        </View>

        {visits.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.textMuted }}>No visit history found.</Text>
          </View>
        ) : (
          visits.map((visit, index) => (
            <View key={visit.id} style={[styles.visitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.visitHeader}>
                <View>
                  <Text style={[styles.visitDate, { color: colors.textMuted }]}>
                    {new Date(visit.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  <Text style={[styles.visitDiagnosis, { color: colors.text }]}>
                    {visit.diagnosis || 'Health Examination'}
                  </Text>
                </View>
                {index === 0 && (
                  <View style={[styles.latestBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800' }}>LATEST</Text>
                  </View>
                )}
              </View>

              {visit.symptoms?.length > 0 && (
                <View style={styles.pillContainer}>
                  {visit.symptoms.map(s => (
                    <View key={s} style={[styles.pill, { backgroundColor: colors.surfaceLight }]}>
                      <Text style={[styles.pillText, { color: colors.textSecondary }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}

              {visit.prescription && (
                <View style={[styles.prescriptionBox, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                  <Ionicons name="medical" size={16} color={colors.primary} />
                  <Text style={[styles.prescriptionText, { color: colors.text }]}>{visit.prescription}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* Lab Results */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="flask-outline" size={24} color={colors.warning} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Lab Results</Text>
        </View>

        {labs.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.textMuted }}>No lab results available.</Text>
          </View>
        ) : (
          labs.map(lab => (
            <TouchableOpacity 
              key={lab.id} 
              style={[styles.labItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('LabResultDetail', { 
                result: lab, 
                patientName: `${profile.first_name} ${profile.last_name}` 
              })}
            >
              <View style={styles.labInfo}>
                <View style={[styles.statusDot, { backgroundColor: lab.notified_at ? colors.textMuted : colors.warning }]} />
                <View>
                  <Text style={[styles.labType, { color: colors.text }]}>{lab.test_type}</Text>
                  <Text style={[styles.labDate, { color: colors.textMuted }]}>{new Date(lab.uploaded_at).toLocaleDateString()}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, fontSize: fontSize.md, fontWeight: '600' },
  
  headerCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  userName: { color: '#FFF', fontSize: fontSize.xl, fontWeight: '800' },
  idBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  idText: { color: '#FFF', fontSize: 10, fontWeight: '800', fontFamily: 'monospace' },
  userSubInfo: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm, marginBottom: spacing.lg },
  
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: spacing.md,
  },
  statItem: { flex: 1 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  statValue: { color: '#FFF', fontSize: fontSize.md, fontWeight: '700', marginTop: 2 },

  qrCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  qrHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  qrTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginLeft: 8 },
  qrContainer: {
    backgroundColor: '#FFF',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  qrImage: { width: 140, height: 140 },
  qrActionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, width: '100%', justifyContent: 'center' },
  qrActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  qrActionText: { fontSize: 13, fontWeight: '700' },
  qrHint: { fontSize: fontSize.xs, textAlign: 'center', lineHeight: 18, marginTop: spacing.md },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.sm },
  mainTitle: { fontSize: 24, fontWeight: '900' },
  inlineRefresh: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },


  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', marginLeft: spacing.sm },
  
  emptyState: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },

  visitCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  visitHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  visitDate: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  visitDiagnosis: { fontSize: fontSize.md, fontWeight: '700' },
  latestBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: '600' },
  
  prescriptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 8,
  },
  prescriptionText: { fontSize: fontSize.sm, fontWeight: '500', flex: 1 },

  labItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  labInfo: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.md },
  labType: { fontSize: fontSize.sm, fontWeight: '700' },
  labDate: { fontSize: 11, marginTop: 2 },
});
