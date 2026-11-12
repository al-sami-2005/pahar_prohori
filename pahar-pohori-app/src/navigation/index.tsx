import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer, type LinkingOptions, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AboutModelScreen from '../screens/AboutModelScreen';
import AlertsScreen from '../screens/AlertsScreen';
import HillDetailScreen from '../screens/HillDetailScreen';
import MapScreen from '../screens/MapScreen';
import MoreScreen from '../screens/MoreScreen';
import ReportScreen from '../screens/ReportScreen';
import RouteScreen from '../screens/RouteScreen';
import SafetyGuideScreen from '../screens/SafetyGuideScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SheltersScreen from '../screens/SheltersScreen';
import SOSScreen from '../screens/SOSScreen';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme';
import { useWindowDimensions } from 'react-native';
import TabBar, { RAIL_BREAKPOINT } from './TabBar';

/**
 * App map
 *  Tabs:  Map · Alerts · SOS · Shelters · More
 *  Stack: HillDetail · Route · Report · SafetyGuide · Settings · AboutModel
 */
export type TabsParams = {
  Map: undefined;
  Alerts: undefined;
  SOS: undefined;
  Shelters: undefined;
  More: undefined;
};

export type RootStack = {
  Tabs: NavigatorScreenParams<TabsParams> | undefined;
  HillDetail: { hillId: number };
  Route: { shelterId: number; fromHillId?: number; fromLat?: number; fromLon?: number; fromLabel?: string; live?: boolean };
  Report: { hillId?: number } | undefined;
  SafetyGuide: undefined;
  Settings: undefined;
  AboutModel: undefined;
};

const Tab = createBottomTabNavigator<TabsParams>();
const Stack = createNativeStackNavigator<RootStack>();

function Tabs() {
  const { width } = useWindowDimensions();
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />}
      screenOptions={{ headerShown: false, tabBarPosition: width >= RAIL_BREAKPOINT ? 'left' : 'bottom' }}>
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="SOS" component={SOSScreen} />
      <Tab.Screen name="Shelters" component={SheltersScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}


const linking: LinkingOptions<RootStack> = {
  prefixes: ['paharpohori://'],
  config: {
    screens: {
      Tabs: { screens: { Map: '', Alerts: 'alerts', SOS: 'sos', Shelters: 'shelters', More: 'more' } },
      HillDetail: { path: 'hill/:hillId', parse: { hillId: Number } },
      Route: { path: 'route/:shelterId', parse: { shelterId: Number, fromHillId: Number } },
      Report: 'report',
      SafetyGuide: 'guide',
      Settings: 'settings',
      AboutModel: 'about',
    },
  },
};

export default function RootNavigator() {
  const c = useTheme();
  const base = c.dark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: c.bg, card: c.surface, text: c.ink, border: c.line } };
  return (
    <NavigationContainer theme={theme} linking={linking} documentTitle={{ formatter: () => 'Pahar Pohori' }}>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="HillDetail" component={HillDetailScreen} />
        <Stack.Screen name="Route" component={RouteScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Report" component={ReportScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="SafetyGuide" component={SafetyGuideScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="AboutModel" component={AboutModelScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
