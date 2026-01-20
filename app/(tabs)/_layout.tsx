import { Redirect, Tabs } from "expo-router";
import {
  LayoutDashboard,
  Car,
  ClipboardList,
  Users,
  UserCheck,
  Settings,
  Factory,
} from "lucide-react-native";
import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import type { AppTabName } from "@/contexts/AuthContext";

type TabConfig = {
  name: AppTabName;
  title: string;
  icon: React.ComponentType<{ color?: string; size?: number }>;
};

const TAB_CONFIG: readonly TabConfig[] = [
  {
    name: "index",
    title: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "vehicles",
    title: "Vehículos",
    icon: Car,
  },
  {
    name: "work-orders",
    title: "Órdenes",
    icon: ClipboardList,
  },
  {
    name: "workshops",
    title: "Mecánicas",
    icon: Factory,
  },
  {
    name: "clients",
    title: "Clientes",
    icon: UserCheck,
  },
  {
    name: "users",
    title: "Usuarios",
    icon: Users,
  },
  {
    name: "settings",
    title: "Ajustes",
    icon: Settings,
  },
] as const;

export default function TabLayout() {
  const { user, isLoading, permissions } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarHideOnKeyboard: true,
        headerShown: true,
        headerStyle: {
          backgroundColor: "#2563eb",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "600" as const,
        },
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500" as const,
        },
      }}
    >
      {TAB_CONFIG.map((tab) => {
        const IconComponent = tab.icon;
        const isAccessible = permissions.accessibleTabs.includes(tab.name);
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              href: isAccessible ? undefined : null,
              tabBarIcon: ({ color, size }) => (
                <IconComponent size={size} color={color} />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
});
