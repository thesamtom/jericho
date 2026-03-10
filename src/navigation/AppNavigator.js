import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import { AdminTabs, StudentTabs, ParentTabs, WardenTabs } from './TabNavigators';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

function getRoleNavigator(role) {
  switch (role) {
    case 'admin':
      return AdminTabs;
    case 'student':
      return StudentTabs;
    case 'parent':
      return ParentTabs;
    case 'warden':
      return WardenTabs;
    default:
      return StudentTabs;
  }
}

export default function AppNavigator() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  const RoleNavigator = getRoleNavigator(role);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={RoleNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
  },
});
