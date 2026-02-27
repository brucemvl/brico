import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useContext, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useApi } from "../services/api";

type RequestType = {
  _id: string;
  category: string;
  status: string;
  client: string;
  title: string;
  // ajoute d'autres champs selon ton modèle
};

export default function HomeClient() {
  const router = useRouter();
  const { logout } = useContext(AuthContext)!;
  const { apiFetch } = useApi();

  const [requests, setRequests] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Fonction pour récupérer les demandes
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/requests/client");
      setRequests(data);
    } catch (err) {
      console.error("Erreur fetchRequests:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Rafraîchit la liste à chaque retour sur cet écran
  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  // 🔹 Supprimer une demande
  const handleDelete = async (id: string) => {
    Alert.alert(
      "Supprimer la demande",
      "Êtes-vous sûr de vouloir supprimer cette demande ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/requests/${id}`, { method: "DELETE" });
              // On retire la demande du state pour mise à jour immédiate
              setRequests(prev => prev.filter(req => req._id !== id));
            } catch (err) {
              console.error("Erreur suppression :", err);
              Alert.alert("Erreur", "Impossible de supprimer cette demande.");
            }
          },
        },
      ]
    );
  };

  // 🔹 Déconnexion
  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Chargement des demandes...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Accueil Particulier</Text>
      <Text style={styles.title}>Mes demandes</Text>

      {requests.length === 0 ? (
        <Text>Aucune demande pour le moment</Text>
      ) : (
        requests.map((item) => (
          <View key={item._id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={styles.card}>
              <Text style={{ fontWeight: "bold" }}>{item.title}</Text>
              <Text>Catégorie: {item.category}</Text>
              <Text>Statut: {item.status}</Text>
              {/* ajoute d'autres infos si besoin */}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item._id)}>
              <Text style={{ color: "red" }}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <TouchableOpacity onPress={() => router.push('/createRequestForm')} style={{ marginTop: 20 }}>
        <Text style={{ color: "black", fontSize: 16 }}>+ Nouvelle Demande</Text>
      </TouchableOpacity>

      <Text style={{ marginTop: 10 }}>Créer une demande, voir l'historique...</Text>
      <Button title="Déconnexion" onPress={handleLogout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  card: { padding: 12, marginBottom: 10, borderWidth: 1, borderRadius: 8, flex: 1 },
});