import React, { useState, useEffect, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert as RNAlert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/theme';

export const alertRef = React.createRef();

export const setupCustomAlert = () => {
  const originalAlert = RNAlert.alert;
  RNAlert.alert = (title, message, buttons, options) => {
    if (alertRef.current) {
      alertRef.current.showAlert(title, message, buttons, options);
    } else {
      // Fallback
      originalAlert(title, message, buttons, options);
    }
  };
};

export function CustomAlertProvider({ children }) {
  const { colors } = useTheme();
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  useEffect(() => {
    setupCustomAlert();
  }, []);

  const handleShow = useCallback((title, message, buttons) => {
    const defaultButtons = [{ text: 'OK', onPress: () => {} }];
    setAlertConfig({
      visible: true,
      title: title || '',
      message: message || '',
      buttons: buttons && buttons.length > 0 ? buttons : defaultButtons,
    });
  }, []);

  const handleClose = useCallback(() => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  }, []);

  React.useImperativeHandle(alertRef, () => ({
    showAlert: handleShow
  }));

  return (
    <>
      {children}
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.alertBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {!!alertConfig.title && <Text style={[styles.title, { color: colors.text }]}>{alertConfig.title}</Text>}
            {!!alertConfig.message && <Text style={[styles.message, { color: colors.textMuted }]}>{alertConfig.message}</Text>}
            
            <View style={styles.buttonRow}>
              {alertConfig.buttons.map((btn, index) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel' || btn.style === 'default' && (btn.text==='Cancel' || btn.text==='Nope');
                const isPrimary = !isDestructive && !isCancel;
                
                return (
                  <TouchableOpacity
                    key={index.toString()}
                    style={[
                      styles.button,
                      { borderColor: colors.border },
                      isDestructive && { backgroundColor: (colors.danger || '#ef4444') + '20', borderColor: colors.danger || '#ef4444' },
                      isCancel && { backgroundColor: 'transparent' },
                      isPrimary && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => {
                      handleClose();
                      if (btn.onPress) {
                        setTimeout(() => btn.onPress(), 150);
                      }
                    }}
                  >
                    <Text style={[
                      styles.buttonText,
                      isDestructive && { color: colors.danger || '#ef4444' },
                      isCancel && { color: colors.textMuted },
                      isPrimary && { color: '#0b0f19' }
                    ]}>
                      {btn.text || 'OK'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  alertBox: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  }
});
