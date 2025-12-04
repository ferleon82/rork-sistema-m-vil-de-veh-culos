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
import type { RolePermissions } from "@/contexts/AuthContext";

type TabConfig = {
  name: string;
  title: string;
  icon: React.ComponentType<{ color?: string; size?: number }>;
  isVisible: (permissions: RolePermissions) => boolean;
};

const TAB_CONFIG: readonly TabConfig[] = [
  {
    name: "index",
    title: "Dashboard",
    icon: LayoutDashboard,
    isVisible: (_permissions: RolePermissions) => true,
  },
  {
    name: "vehicles",
    title: "Vehículos",
    icon: Car,
    isVisible: (permissions: RolePermissions) => permissions.canManageVehicles,
  },
  {
    name: "work-orders",
    title: "Órdenes",
    icon: ClipboardList,
    isVisible: (permissions: RolePermissions) =>
      permissions.canManageWorkOrders || permissions.viewOnlyAssignedWorkOrders,
  },
  {
    name: "workshops",
    title: "Mecánicas",
    icon: Factory,
    isVisible: (permissions: RolePermissions) => permissions.canManageWorkshops,
  },
  {
    name: "clients",
    title: "Clientes",
    icon: UserCheck,
    isVisible: (permissions: RolePermissions) => permissions.canManageClients,
  },
  {
    name: "users",
    title: "Usuarios",
    icon: Users,
    isVisible: (permissions: RolePermissions) => permissions.canManageUsers,
  },
  {
    name: "settings",
    title: "Ajustes",
    icon: Settings,
    isVisible: (_permissions: RolePermissions) => true,
  },
] as const;

export default function TabLayout() {
  const { user, isLoading, permissions } = useAuth();

  const visibleTabs = useMemo(() => {
    return TAB_CONFIG.filter((tab) => tab.isVisible(permissions));
  }, [permissions]);

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
      {visibleTabs.map((tab) => {
        const IconComponent = tab.icon;
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
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
