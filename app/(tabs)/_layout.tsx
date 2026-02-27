import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import HomeClient from '../homeClient';
import HomePro from '../homePro';

const Tab = createBottomTabNavigator();

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