import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';

// Admin
import AdminDashboard from '../screens/admin/AdminDashboard';
import HostelStudents from '../screens/admin/HostelStudents';
import StudentMovementHistory from '../screens/admin/StudentMovementHistory';

// Student
import StudentDashboard from '../screens/student/StudentDashboard';
import MovementRequest from '../screens/student/MovementRequest';
import ComplaintScreen from '../screens/student/ComplaintScreen';
import FeePayment from '../screens/student/FeePayment';

// Parent
import ParentDashboard from '../screens/parent/ParentDashboard';

// Warden
import WardenDashboard from '../screens/warden/WardenDashboard';
import WardenComplaintsScreen from '../screens/warden/WardenComplaintsScreen';
import WardenComplaintDetailScreen from '../screens/warden/WardenComplaintDetailScreen';

// Shared
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = { headerShown: false };

// ───────── Admin Tab Navigator ─────────
function AdminHome() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="AdminHome" component={AdminDashboard} />
      <Stack.Screen name="HostelStudents" component={HostelStudents} />
      <Stack.Screen name="StudentMovementHistory" component={StudentMovementHistory} />
    </Stack.Navigator>
  );
}

export function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="Dashboard"
        component={AdminHome}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

// ───────── Student Tab Navigator ─────────
function StudentHome() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="StudentHome" component={StudentDashboard} />
      <Stack.Screen name="MovementRequest" component={MovementRequest} />
      <Stack.Screen name="FeePayment" component={FeePayment} />
    </Stack.Navigator>
  );
}

function StudentRequests() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MovementRequestList" component={MovementRequest} />
    </Stack.Navigator>
  );
}

function StudentComplaints() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ComplaintList" component={ComplaintScreen} />
    </Stack.Navigator>
  );
}

export function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="Dashboard"
        component={StudentHome}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Requests"
        component={StudentRequests}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="arrow-right-circle" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Complaints"
        component={StudentComplaints}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="alert-triangle" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

// ───────── Parent Tab Navigator ─────────
function ParentHome() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ParentHome" component={ParentDashboard} />
      <Stack.Screen name="FeePayment" component={FeePayment} />
    </Stack.Navigator>
  );
}

export function ParentTabs() {
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="Dashboard"
        component={ParentHome}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

// ───────── Warden Tab Navigator ─────────
function WardenHome() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="WardenHome" component={WardenDashboard} />
    </Stack.Navigator>
  );
}

function WardenComplaints() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="WardenComplaintsList" component={WardenComplaintsScreen} />
      <Stack.Screen name="WardenComplaintDetail" component={WardenComplaintDetailScreen} />
    </Stack.Navigator>
  );
}

export function WardenTabs() {
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="Dashboard"
        component={WardenHome}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Complaints"
        component={WardenComplaints}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="alert-triangle" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

// ───────── Shared Tab Bar Config ─────────
const tabBarOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary.main,
  tabBarInactiveTintColor: colors.neutral.textMuted,
  tabBarStyle: {
    height: 70,
    paddingBottom: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
    backgroundColor: colors.neutral.background,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '500',
  },
};
