import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/theme';

export default function QRScannerScreen({ navigation }) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.message, { color: colors.text }]}>Scanner requires camera access to read physical patient cards.</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    if (data.startsWith('ECOMEDIK_QR:')) {
      const parts = data.split(':');
      const patientId = parts[1];
      const name = parts[2] || 'Unknown';
      const bloodGroup = parts[3] || 'Unknown';
      
      Alert.alert('Patient Scanned', `Found ${name}\nBlood Group: ${bloodGroup}\n\nDo you want to load their health profile?`, [
        { text: 'Cancel', style: 'cancel', onPress: () => setTimeout(() => setScanned(false), 2000) },
        { text: 'Load Profile', onPress: () => {
          navigation.replace('PatientDetail', { patientId });
        }}
      ]);
    } else if (data.startsWith('ECON-')) {
       // Support old format without metadata
       const patientId = data.replace('ECON-', '');
       navigation.replace('PatientDetail', { patientId });
    } else {
      Alert.alert('Invalid QR Code', 'This is not an ECO~MEDIK patient QR code.', [
        { text: 'Try Again', onPress: () => setTimeout(() => setScanned(false), 1500) }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan Patient QR</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.scanTarget}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.footerText}>Align the patient's physical EcoMedik QR code within the target bounds to load their full records instantly.</Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  message: { textAlign: 'center', paddingBottom: 10, marginTop: 20, fontSize: 16, paddingHorizontal: 40, lineHeight: 22 },
  button: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, marginTop: 20 },
  buttonText: { color: '#0b0f19', fontWeight: '900', letterSpacing: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'space-between', padding: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  scanTarget: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#00f2fe', borderWidth: 4 },
  cornerTL: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0 },
  footerText: { color: '#FFF', textAlign: 'center', marginBottom: 40, fontSize: 14, fontWeight: '600', paddingHorizontal: 10, lineHeight: 20 },
});
