import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

import PatientPortalScreen from '../screens/PatientPortalScreen';
import DoctorDashboardScreen from '../screens/DoctorDashboardScreen';
import LabTechDashboardScreen from '../screens/LabTechDashboardScreen';
import ReceptionistDashboardScreen from '../screens/ReceptionistDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import PatientDirectoryScreen from '../screens/PatientDirectoryScreen';
import BroadcastsScreen from '../screens/BroadcastsScreen';
import LabResultsScreen from '../screens/LabResultsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AdminUserManagementScreen from '../screens/AdminUserManagementScreen';
import OutbreakMonitorScreen from '../screens/OutbreakMonitorScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { colors } = useTheme();
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.user_metadata?.role) {
        setRole(session.user.user_metadata.role);
      } else {
        setRole('patient');
      }
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const getDashboardComponent = () => {
    switch (role) {
      case 'doctor': return DoctorDashboardScreen;
      case 'labtech': return LabTechDashboardScreen;
      case 'nurse':
      case 'receptionist': return ReceptionistDashboardScreen;
      case 'admin': return AdminDashboardScreen;
      default: return PatientPortalScreen;
    }
  };

  const isStaff = role === 'nurse' || role === 'admin' || role === 'doctor' || role === 'receptionist' || role === 'labtech';
  const isAdmin = role === 'admin';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard' || route.name === 'MyRecords') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Directory') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Labs') {
            iconName = focused ? 'flask' : 'flask-outline';
          } else if (route.name === 'Broadcasts') {
            iconName = focused ? 'megaphone' : 'megaphone-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {/* 1. Dashboard Tab */}
      <Tab.Screen 
        name={isStaff ? "Dashboard" : "MyRecords"} 
        component={getDashboardComponent()} 
        options={{ title: isStaff ? 'Dashboard' : 'My Records' }}
      />

      {/* 2. Staff Specific Tabs */}
      {isStaff && (
        <>
          <Tab.Screen name="Directory" component={PatientDirectoryScreen} />
          <Tab.Screen name="Labs" component={LabResultsScreen} />
          <Tab.Screen name="Broadcasts" component={BroadcastsScreen} />
        </>
      )}

      {/* 3. Settings Tab */}
      <Tab.Screen name="Settings" component={SettingsScreen} />
      
    </Tab.Navigator>
  );
}
