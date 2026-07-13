import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { DebugScreen } from '../screens/auth/DebugScreen';

import { AstrologerListScreen } from '../screens/customer/AstrologerListScreen';
import { AstrologerDetailScreen } from '../screens/customer/AstrologerDetailScreen';
import { ChatScreen } from '../screens/customer/ChatScreen';
import { WalletScreen } from '../screens/customer/WalletScreen';

import { AstrologerDashboardScreen } from '../screens/astrologer/AstrologerDashboardScreen';
import { AstrologerEarningsScreen } from '../screens/astrologer/AstrologerEarningsScreen';

const AuthStack = createNativeStackNavigator();
const CustomerStack = createNativeStackNavigator();
const CustomerTabs = createBottomTabNavigator();
const AstrologerStack = createNativeStackNavigator();
const AstrologerTabs = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bgVoid,
    card: colors.bgPanel,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accentGold,
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: colors.bgPanel },
  headerTintColor: colors.textPrimary,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bgVoid },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="Debug" component={DebugScreen} options={{ headerShown: true, title: 'Debug' }} />
    </AuthStack.Navigator>
  );
}

function CustomerTabsNavigator() {
  return (
    <CustomerTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bgPanel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accentGold,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      <CustomerTabs.Screen name="Astrologers" component={AstrologerListScreen} />
      <CustomerTabs.Screen name="Wallet" component={WalletScreen} />
    </CustomerTabs.Navigator>
  );
}

function CustomerNavigator() {
  return (
    <CustomerStack.Navigator screenOptions={screenOptions}>
      <CustomerStack.Screen name="Tabs" component={CustomerTabsNavigator} options={{ headerShown: false }} />
      <CustomerStack.Screen
        name="AstrologerDetail"
        component={AstrologerDetailScreen}
        options={{ title: 'Astrologer' }}
      />
      <CustomerStack.Screen name="Chat" component={ChatScreen} options={{ title: 'Consultation' }} />
      <CustomerStack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
    </CustomerStack.Navigator>
  );
}

function AstrologerTabsNavigator() {
  return (
    <AstrologerTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bgPanel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accentGold,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      <AstrologerTabs.Screen name="Dashboard" component={AstrologerDashboardScreen} />
      <AstrologerTabs.Screen name="Earnings" component={AstrologerEarningsScreen} />
    </AstrologerTabs.Navigator>
  );
}

function AstrologerNavigator() {
  return (
    <AstrologerStack.Navigator screenOptions={screenOptions}>
      <AstrologerStack.Screen name="Tabs" component={AstrologerTabsNavigator} options={{ headerShown: false }} />
      <AstrologerStack.Screen name="Chat" component={ChatScreen} options={{ title: 'Consultation' }} />
    </AstrologerStack.Navigator>
  );
}

export function RootNavigator() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgVoid, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accentGold} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {!session || !profile ? (
        <AuthNavigator />
      ) : profile.role === 'astrologer' ? (
        <AstrologerNavigator />
      ) : (
        <CustomerNavigator />
      )}
    </NavigationContainer>
  );
}
