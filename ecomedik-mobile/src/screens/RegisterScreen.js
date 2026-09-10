import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, fontSize } from '../theme/theme';
import { supabase } from '../lib/supabase';

export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    const { firstName, lastName, phone, password } = formData;
    
    if (!firstName || !lastName || !phone || !password) {
      Alert.alert('Incomplete', 'Please fill in all fields (First Name, Last Name, Phone, Password).');
      return;
    }

    setIsLoading(true);

    const cleanedPhone = phone.replace(/\+/g, '').replace(/\s/g, '');
    const syntheticEmail = `${cleanedPhone}@patient.eco-medic.local`;

    const { data, error } = await supabase.auth.signUp({
      email: syntheticEmail,
      password: password,
      options: {
        data: {
          role: 'patient',
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          // Missing details (DOB, gender, etc.) will be filled out by the patient later inside the app
        },
      },
    });

    setIsLoading(false);

    if (error) {
      Alert.alert('Registration Failed', error.message);
      return;
    }

    Alert.alert('Welcome!', 'Your basic account has been created. You can fill in the rest of your details later.', [
      { text: 'OK', onPress: () => { if (!data.session) navigation.navigate('Login'); } }
    ]);
  };

  const updateForm = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surfaceLight,
      borderColor: colors.border,
      color: colors.text,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Register with your basic details. You can complete your medical profile later.
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>First Name *</Text>
              <TextInput style={inputStyle} value={formData.firstName} onChangeText={(val) => updateForm('firstName', val)} placeholder="e.g. John" placeholderTextColor={colors.textMuted} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Last Name *</Text>
              <TextInput style={inputStyle} value={formData.lastName} onChangeText={(val) => updateForm('lastName', val)} placeholder="e.g. Doe" placeholderTextColor={colors.textMuted} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Phone *</Text>
              <TextInput style={inputStyle} value={formData.phone} onChangeText={(val) => updateForm('phone', val)} placeholder="+237 6XX..." placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Password *</Text>
              <TextInput style={inputStyle} value={formData.password} onChangeText={(val) => updateForm('password', val)} placeholder="••••••••" placeholderTextColor={colors.textMuted} secureTextEntry />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={isLoading ? [colors.textMuted, colors.textMuted] : colors.gradientHero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerButton}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.registerButtonText}>Register Profile</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={[styles.loginText, { color: colors.textMuted }]}>
              Already have an account?{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                Sign in
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl * 2,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: fontSize.md,
  },
  buttonWrapper: {
    marginTop: spacing.sm,
  },
  registerButton: {
    paddingVertical: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loginLink: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  loginText: {
    fontSize: fontSize.sm,
  },
});
