import { Redirect, Tabs, useRouter } from "expo-router";
import {
  LayoutDashboard,
  Car,
  ClipboardList,
  Users,
  UserCheck,
  Settings,
  Factory,
  LogOut,
  Bell,
} from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationsContext";
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
  const { user, isLoading, isAdmin, logout, permissions } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

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
        headerRight: () => (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push('/notifications' as any)}
              style={styles.headerIconButton}
              accessibilityLabel="Notificaciones"
            >
              <Bell size={22} color="#fff" />
              {unreadCount > 0 && <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>}
            </TouchableOpacity>
            {!isAdmin && (
              <TouchableOpacity
                onPress={confirmLogout}
                style={styles.headerIconButton}
                accessibilityLabel="Cerrar sesión"
                testID="header-logout-button"
              >
                <LogOut size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        ),
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingBottom: Math.max(insets.bottom, 4),
          paddingTop: 4,
          height: 60 + insets.bottom,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  headerIconButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 1,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700' as const,
  },
});
