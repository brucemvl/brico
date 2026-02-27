import { useRouter } from 'expo-router';
import { useContext } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function HomePro() {

  const router = useRouter();
  const { logout } = useContext(AuthContext)!;
  
      const handleLogout = async () => {
    await logout();
    router.replace('/');
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accueil Professionnel</Text>
      <Text>Voir les demandes disponibles, abonnement...</Text>
            <Button title="Déconnexion" onPress={handleLogout} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});