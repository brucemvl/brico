import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function HomeClient() {
  const router = useRouter();
const { logout } = useContext(AuthContext)!;

    const handleLogout = async () => {
  await logout();
  router.replace('/');
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accueil Particulier</Text>
      <TouchableOpacity onPress={() =>
            router.push({ pathname: '/createRequestForm' })
          }>
        <Text style={{color: "black"}}>+ Nouvelle Demande</Text>
      </TouchableOpacity>
      <Text>Créer une demande, voir l'historique...</Text>
      <Button title="Déconnexion" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});