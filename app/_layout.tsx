import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { useColorScheme } from '../hooks/use-color-scheme';

import { useEffect, useRef } from "react";
import { useApi } from "../services/api";
import { registerForPushNotifications } from "../services/registerForPushNotifications";

function PushInitializer() {
  const { apiFetch, user, loading } = useApi();
  const alreadySent = useRef(false);

  useEffect(() => {
    if (alreadySent.current) return;
    if (loading || !user) return; // 🔹 attendre que user soit chargé

    const initPush = async () => {
      const token = await registerForPushNotifications();
      if (!token) return;

      console.log("Sending push token for", user.role);

      await apiFetch("/users/push-token", {
        method: "POST",
        body: JSON.stringify({ token })
      });

      alreadySent.current = true;
    };

    initPush();
  }, [loading, user, apiFetch]);

  return null;
}

export default function RootLayout() {

  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <AuthProvider>

      {/* 🔔 Initialisation push */}
      <PushInitializer />

      <ThemeProvider value={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>

    </AuthProvider>
  );
}