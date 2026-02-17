// ============================================================
// ÆONIS – Tab Layout (Digital Grimoire)
// 5 Tabs: Home, Sanctum, Radar, Path, Adept
// Uses lucide-react-native for crisp icons
// ============================================================

import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { LucideIcon } from "@/components/ui/lucide-icon";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#6B6B6B',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: '#050505',
          borderTopColor: '#1A1A1A',
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <LucideIcon name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sanctum"
        options={{
          title: "Sanctum",
          tabBarIcon: ({ color }) => <LucideIcon name="flame" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="compass"
        options={{
          title: "Radar",
          tabBarIcon: ({ color }) => <LucideIcon name="compass" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="path"
        options={{
          title: "Path",
          tabBarIcon: ({ color }) => <LucideIcon name="trophy" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="adept"
        options={{
          title: "Adept",
          tabBarIcon: ({ color }) => <LucideIcon name="user" size={22} color={color} />,
        }}
      />
      {/* Hidden tabs - accessible via navigation but not in tab bar */}
      <Tabs.Screen name="chart" options={{ href: null }} />
      <Tabs.Screen name="runes" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
