import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import { usePathname, useRouter } from "expo-router";
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import HomeClient from '../homeClient';
import HomePro from '../homePro';

const Tab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // ✅ remplace alert
    shouldShowList: true,   // ✅ pour centre de notif
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function TabLayout() {
  const context = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();

  if (!context) throw new Error("AuthContext non fourni"); // TypeScript sûr

  const { user, loading } = context;

  if (loading) return null; // loader si tu veux

  if (!user) return null;

if (user.role === "pro" && !user.onboardingCompleted) {
  return null; // ❗ empêche HomePro de s'afficher
}

console.log("USER:", user);
console.log("ROLE:", user?.role);
console.log("ONBOARDING:", user?.onboardingCompleted);

  return (
    <Tab.Navigator>
      {user.role === 'client' ? (
        <Tab.Screen name="HomeClient" component={HomeClient} />
      ) : (
        <Tab.Screen name="HomePro" component={HomePro} />
      )}
    </Tab.Navigator>
  );
}