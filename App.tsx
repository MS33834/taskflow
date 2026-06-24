import React, { useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  RootStackParamList,
  MainTabParamList,
  HomeStackParamList,
  CalendarStackParamList,
  AnalyticsStackParamList,
  SearchStackParamList,
} from './src/shared/types';
import { useAppStore } from './src/shared/store';
import { ToastContainer } from './src/shared/components/common/Toast';
import { ErrorBoundary } from './src/shared/components/common/ErrorBoundary';
import { QuickAddTask } from './src/shared/components/common/QuickAddTask';
import { useKeyboardShortcuts } from './src/shared/hooks/useKeyboardShortcuts';
import { useResponsiveLayout } from './src/shared/hooks/useResponsiveLayout';
import HomeScreen from './screens/HomeScreen';
import TaskDetailScreen from './screens/TaskDetailScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import SearchScreen from './screens/SearchScreen';
import CalendarScreen from './screens/CalendarScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import GoalsScreen from './screens/GoalsScreen';
import SettingsScreen from './screens/SettingsScreen';
import HabitsScreen from './screens/HabitsScreen';
import NotesScreen from './screens/NotesScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import TagsScreen from './screens/TagsScreen';
import ViewsScreen from './screens/ViewsScreen';
import TemplatesScreen from './screens/TemplatesScreen';
import AutomationScreen from './screens/AutomationScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();
const AnalyticsStack = createNativeStackNavigator<AnalyticsStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();

function HomeStackScreen() {
  const { theme } = useAppStore();
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: false,
      }}
    >
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ title: 'TaskFlow' }} />
      <HomeStack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <HomeStack.Screen name="Categories" component={CategoriesScreen} />
      <HomeStack.Screen name="Projects" component={ProjectsScreen} />
      <HomeStack.Screen name="Goals" component={GoalsScreen} />
      <HomeStack.Screen name="Habits" component={HabitsScreen} />
      <HomeStack.Screen name="Notes" component={NotesScreen} />
      <HomeStack.Screen name="Settings" component={SettingsScreen} />
      <HomeStack.Screen name="Tags" component={TagsScreen} />
      <HomeStack.Screen name="Views" component={ViewsScreen} />
      <HomeStack.Screen name="Templates" component={TemplatesScreen} />
      <HomeStack.Screen name="Automation" component={AutomationScreen} />
      <HomeStack.Screen name="Analytics" component={AnalyticsScreen} />
      <HomeStack.Screen name="Calendar" component={CalendarScreen} />
    </HomeStack.Navigator>
  );
}

function CalendarStackScreen() {
  const { theme } = useAppStore();
  return (
    <CalendarStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: false,
      }}
    >
      <CalendarStack.Screen name="Calendar" component={CalendarScreen} options={{ title: '日历' }} />
      <CalendarStack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: '任务详情' }} />
    </CalendarStack.Navigator>
  );
}

function AnalyticsStackScreen() {
  const { theme } = useAppStore();
  return (
    <AnalyticsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: false,
      }}
    >
      <AnalyticsStack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: '统计' }} />
    </AnalyticsStack.Navigator>
  );
}

function SearchStackScreen() {
  const { theme } = useAppStore();
  return (
    <SearchStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: false,
      }}
    >
      <SearchStack.Screen name="Search" component={SearchScreen} options={{ title: '搜索' }} />
      <SearchStack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: '任务详情' }} />
    </SearchStack.Navigator>
  );
}

function CreateTabButton({ onPress, layout }: { onPress: () => void; layout: ReturnType<typeof useResponsiveLayout> }) {
  const { theme } = useAppStore();
  const fabSize = layout.isXSmall ? 48 : 56;

  return (
    <TouchableOpacity
      style={styles.fabContainer}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[
        styles.fab,
        {
          backgroundColor: theme.colors.primary,
          shadowColor: theme.colors.primary,
          width: fabSize,
          height: fabSize,
          borderRadius: fabSize / 2,
          marginTop: -fabSize / 2,
        },
      ]}>
        <MaterialIcons name="add" size={fabSize * 0.54} color={theme.colors.onPrimary} />
      </View>
    </TouchableOpacity>
  );
}

function CreatePlaceholder() {
  return <View />;
}

function getTabBarIcon(routeName: string, focused: boolean, color: string, isSmall: boolean) {
  let iconName: keyof typeof MaterialIcons.glyphMap = 'circle';
  const iconSize = isSmall ? (focused ? 22 : 20) : (focused ? 24 : 22);

  switch (routeName) {
    case 'HomeTab':
      iconName = focused ? 'check-circle' : 'check-circle-outline';
      break;
    case 'CalendarTab':
      iconName = focused ? 'event' : 'event-available';
      break;
    case 'AnalyticsTab':
      iconName = 'insights';
      break;
    case 'SearchTab':
      iconName = 'search';
      break;
  }

  return <MaterialIcons name={iconName} size={iconSize} color={color} />;
}

function MainTabsScreen() {
  const { theme } = useAppStore();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const layout = useResponsiveLayout();
  const {
    isWeb,
    isXSmall,
    isSmall,
    tabBarHeight,
    tabBarBottomOffset,
    tabBarHorizontalInset,
    contentMaxWidth,
    screenPadding,
  } = layout;

  useKeyboardShortcuts({
    'mod+k': () => {
      setShowQuickAdd(false);
    },
    'mod+n': () => setShowQuickAdd(true),
    escape: () => setShowQuickAdd(false),
  });

  const tabLabelSize = isXSmall ? 10 : isSmall ? 11 : isWeb ? 12 : 11;

  return (
    <View style={styles.tabScreenRoot}>
      <View style={[
        styles.tabContentWrapper,
        contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : null,
      ]}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textTertiary,
            tabBarShowLabel: true,
            tabBarLabelPosition: 'below-icon',
            tabBarIconStyle: {
              marginBottom: 0,
            },
            tabBarStyle: {
              position: 'absolute',
              left: tabBarHorizontalInset,
              right: tabBarHorizontalInset,
              bottom: tabBarBottomOffset,
              backgroundColor: theme.colors.glassBackground,
              borderTopWidth: 0,
              borderRadius: 20,
              height: tabBarHeight,
              minHeight: tabBarHeight,
              paddingTop: 0,
              paddingBottom: 0,
              paddingHorizontal: isXSmall ? 2 : 6,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.1,
              shadowRadius: 16,
              elevation: 8,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.glassBorder,
            },
            tabBarLabelStyle: {
              fontSize: tabLabelSize,
              fontWeight: '600',
              letterSpacing: 0.1,
              lineHeight: tabLabelSize + 3,
              marginTop: 2,
              marginBottom: Platform.OS === 'web' ? 4 : 2,
            },
            tabBarItemStyle: {
              paddingVertical: isWeb ? 6 : 4,
              minHeight: tabBarHeight - 4,
            },
            tabBarIcon: ({ focused, color }) =>
              getTabBarIcon(route.name, focused, color, isXSmall || isSmall),
          })}
        >
          <Tab.Screen
            name="HomeTab"
            component={HomeStackScreen}
            options={{ tabBarLabel: '任务' }}
          />
          <Tab.Screen
            name="CalendarTab"
            component={CalendarStackScreen}
            options={{ tabBarLabel: '日历' }}
          />
          <Tab.Screen
            name="CreateTab"
            component={CreatePlaceholder}
            listeners={{
              tabPress: (e) => {
                e.preventDefault();
                setShowQuickAdd(true);
              },
            }}
            options={{
              tabBarLabel: () => null,
              tabBarButton: () => <CreateTabButton onPress={() => setShowQuickAdd(true)} layout={layout} />,
            }}
          />
          <Tab.Screen
            name="AnalyticsTab"
            component={AnalyticsStackScreen}
            options={{ tabBarLabel: '统计' }}
          />
          <Tab.Screen
            name="SearchTab"
            component={SearchStackScreen}
            options={{ tabBarLabel: '搜索' }}
          />
        </Tab.Navigator>
      </View>
      <QuickAddTask visible={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
    </View>
  );
}

export default function App() {
  const { theme, loadData } = useAppStore();
  const layout = useResponsiveLayout();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigationTheme = useMemo(() => {
    const isDark = theme.type === 'dark';
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.error,
      },
    };
  }, [theme.type, theme.colors]);

  return (
    <ErrorBoundary>
      <View style={[
        styles.appRoot,
        { backgroundColor: theme.colors.background },
        layout.isWeb && styles.appRootWeb,
      ]}>
        <NavigationContainer theme={navigationTheme}>
          <RootStack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="MainTabs"
          >
            <RootStack.Screen name="MainTabs" component={MainTabsScreen} />
          </RootStack.Navigator>
          <StatusBar style={theme.type === 'dark' ? 'light' : 'dark'} />
          <ToastContainer />
        </NavigationContainer>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  appRootWeb: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  tabScreenRoot: {
    flex: 1,
  },
  tabContentWrapper: {
    flex: 1,
  },
  fabContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
