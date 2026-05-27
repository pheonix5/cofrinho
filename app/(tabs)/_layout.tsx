import { Tabs } from 'expo-router';
import { CreditCard, Home, PieChart, Settings } from 'lucide-react-native';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);
  const baseBarHeight = Platform.OS === 'ios' ? 56 : 60;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.bgSoft,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: baseBarHeight + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <IconWrap focused={focused}>
              <Home size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
            </IconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: 'Cartões',
          tabBarIcon: ({ color, focused }) => (
            <IconWrap focused={focused}>
              <CreditCard size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
            </IconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color, focused }) => (
            <IconWrap focused={focused}>
              <PieChart size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
            </IconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, focused }) => (
            <IconWrap focused={focused}>
              <Settings size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
            </IconWrap>
          ),
        }}
      />
    </Tabs>
  );
}

function IconWrap({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return (
    <View
      style={{
        width: 44,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: focused ? 'rgba(154,230,110,0.12)' : 'transparent',
      }}
    >
      {children}
    </View>
  );
}
