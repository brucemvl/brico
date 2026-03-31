import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
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

  if (!context) throw new Error("AuthContext non fourni"); // TypeScript sûr

  const { user, loading } = context;

  if (loading) return null; // loader si tu veux

  if (!user) return null; // ou router.replace('/welcome')

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