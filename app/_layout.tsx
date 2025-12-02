import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { UsersProvider } from "@/contexts/UsersContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { VehiclesProvider } from "@/contexts/VehiclesContext";
import { WorkOrdersProvider } from "@/contexts/WorkOrdersContext";
import { ClientsProvider } from "@/contexts/ClientsContext";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <UsersProvider>
              <ClientsProvider>
                <VehiclesProvider>
                  <WorkOrdersProvider>
                    <RootLayoutNav />
                  </WorkOrdersProvider>
                </VehiclesProvider>
              </ClientsProvider>
            </UsersProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
