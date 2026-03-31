import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from "react";
import { AuthProvider } from '../context/AuthContext';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useApi } from "../services/api";
       /* 🔔 Fonction pour récupérer le token */ 
       async function registerForPushNotificationsAsync() { 
        if (!Device.isDevice) { alert('Utilise un vrai téléphone'); return; }const { status: existingStatus } = await Notifications.getPermissionsAsync();
         let finalStatus = existingStatus;
          if (existingStatus !== 'granted')
             { const { status } = await Notifications.requestPermissionsAsync();
           finalStatus = status;
           } if (finalStatus !== 'granted') { alert('Permission refusée');
             return;
             } 
             const tokenData = await Notifications.getExpoPushTokenAsync();
              return tokenData.data; }
               /* ✅ NOUVEAU composant interne (IMPORTANT) */
                function PushRegister() {
                   const { apiFetch, user, loading } = useApi();
                    useEffect(() => {
                       const register = async () => {
                       const token = await registerForPushNotificationsAsync();
                        if (token) { try { await apiFetch("/users/push-token", {
                           method: "POST", body: JSON.stringify({ token }) });
                           } 
                           catch (e) { console.log("Erreur push token", e);

                            } } };
                             register(); },
                              [user, loading]); 
                              return null;
                          }

                          
                                export default function RootLayout() {
                                   const colorScheme = useColorScheme();
                                    const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
                                     return ( 
                                     <AuthProvider> 
                                       <PushRegister /> 
                                       <ThemeProvider value={theme}>
                                         <Stack screenOptions={{ headerShown: false }}> 
                                          <Stack.Screen name="(tabs)" />
                                           <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                                            </Stack> <StatusBar style="auto" />
                                             </ThemeProvider>
                                              </AuthProvider> );
                                }