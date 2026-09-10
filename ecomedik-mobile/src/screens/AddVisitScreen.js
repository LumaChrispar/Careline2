import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, fontSize } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const SYMPTOM_OPTIONS = [
  'Malaria', 'Fever', 'Typhoid', 'Headache', 'Cough', 'Diarrhea', 
  'Fatigue', 'Joint Pain', 'Vomiting', 'Rash', 'Abdominal Pain', 
  'Chest Pain', 'Sore Throat', 'Body Aches'
];

export default function AddVisitScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { patientId, patientName } = route.params;
  
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSymptom = (s) => {
    setSelectedSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleSaveVisit = async () => {
    if (isSubmitting) return;
    if (selectedSymptoms.length === 0 && !diagnosis.trim()) {
      Alert.alert('Required Info', 'Please select at least one symptom or enter a diagnosis.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Your session expired. Please sign in again.');
      const { error } = await supabase.from('visits').insert({
        patient_id: patientId,
        attending_doctor: user.id,
        facility_id: user.user_metadata?.facility_id || null,
        date: new Date().toISOString(),
        symptoms: selectedSymptoms,
        diagnosis: diagnosis.trim(),
        prescription: prescription.trim(),
        notes: notes.trim(),
      });

      if (error) throw error;

      // Trigger outbreak detection
      import('../stores/outbreakStore').then(module => {
         module.default.getState().checkForOutbreaks(user.user_metadata?.facility_id);
      });

      Alert.alert('Success', 'Visit record saved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Record Visit</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Patient: {patientName}</Text>
        </View>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>SYMPTOMS</Text>
        <View style={styles.symptomGrid}>
          {SYMPTOM_OPTIONS.map(s => (
            <TouchableOpacity 
              key={s} 
              onPress={() => toggleSymptom(s)}
              style={[
                styles.symptomBadge, 
                { 
                  backgroundColor: selectedSymptoms.includes(s) ? colors.primary : colors.surface,
                  borderColor: selectedSymptoms.includes(s) ? colors.primary : colors.border
                }
              ]}
            >
              <Text style={[
                styles.symptomText, 
                { color: selectedSymptoms.includes(s) ? '#FFF' : colors.textMuted }
              ]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>DIAGNOSIS</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder="Clinical findings..."
          placeholderTextColor={colors.textMuted}
          value={diagnosis}
          onChangeText={setDiagnosis}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>PRESCRIPTION (Rx)</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder="Medications and dosage..."
          placeholderTextColor={colors.textMuted}
          value={prescription}
          onChangeText={setPrescription}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>ADDITIONAL NOTES</Text>
        <TextInput
          style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder="Any other relevant details..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      <TouchableOpacity 
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={handleSaveVisit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="medical" size={20} color="#FFF" />
            <Text style={styles.saveBtnText}>SAVE VISIT RECORD</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg, gap: 12 },
  title: { fontSize: 20, fontWeight: '900' },
  subtitle: { fontSize: 12, fontWeight: '600' },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  form: { flex: 1 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12, marginTop: spacing.lg },
  
  symptomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symptomBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  symptomText: { fontSize: 11, fontWeight: '700' },

  input: { height: 56, borderWidth: 1, borderRadius: 15, paddingHorizontal: spacing.md, fontSize: 16, marginTop: 4 },
  textArea: { height: 120, borderWidth: 1, borderRadius: 15, padding: spacing.md, fontSize: 16, marginTop: 4, textAlignVertical: 'top' },

  saveBtn: { 
    height: 60, 
    borderRadius: 20, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 12,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  saveBtnText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },
});
