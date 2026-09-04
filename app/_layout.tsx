import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../context/AuthContext';
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
                      if (!user || loading) return; 
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
                                   
                                     return ( 
                                      <GestureHandlerRootView style={{ flex: 1 }}>
                                     <AuthProvider> 
                                       <PushRegister /> 
                                         <Stack screenOptions={{ headerShown: false }}> 
                                          <Stack.Screen name="(tabs)" />
                                           <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                                            </Stack> <StatusBar style="auto" />
                                              </AuthProvider> 
                                              </GestureHandlerRootView>
                                              );
                                }