import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

import { CustomAlertProvider } from './src/components/CustomAlertProvider';

function AppContent() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
    <ThemeProvider>
      <CustomAlertProvider>
        <AppContent />
      </CustomAlertProvider>
    </ThemeProvider>
    </SafeAreaProvider>
  );
}
