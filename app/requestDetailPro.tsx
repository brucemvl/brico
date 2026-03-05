import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Button, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useApi } from "../services/api";

type RequestType = {
  _id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  budget: number;
  status: string;
  images?: { url: string }[];
  client: { name: string; profileImage?: { url: string } };
  pro?: { name: string; profileImage?: { url: string } };
  messages?: { from: string; content: string }[];
};

export default function RequestDetailPro() {
  const { apiFetch } = useApi();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;

  const [request, setRequest] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      try {
        const data = await apiFetch(`/requests/${id}`);
        setRequest(data);
      } catch (err) {
        console.error("Erreur fetch request detail:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  const sendMessage = async () => {
    if (!message.trim() || !request) return;

    try {
      const res = await apiFetch(`/requests/${request._id}/message`, {
        method: "POST",
        body: JSON.stringify({ content: message }),
      });
      setRequest(prev => prev ? { ...prev, messages: res.messages } : prev);
      setMessage("");
    } catch (err) {
      console.error("Erreur envoi message:", err);
    }
  };

  if (loading) return <Text>Chargement...</Text>;
  if (!request) return <Text>Demande introuvable</Text>;

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={styles.title}>{request.title}</Text>
      <Text>Catégorie: {request.category}</Text>
      <Text>Lieu: {request.location}</Text>
      <Text>Budget: {request.budget}€</Text>
      <Text>Description: {request.description || "Pas de description"}</Text>

      {/* 🔹 Images */}
      {request.images && request.images.length > 0 && (
        <FlatList
          horizontal
          data={request.images}
          keyExtractor={(item, i) => `${i}`}
          renderItem={({ item }) => (
            <Image source={{ uri: item.url }} style={styles.image} />
          )}
        />
      )}

      {/* 🔹 Messages */}
      <Text style={{ marginTop: 20, fontWeight: "bold" }}>Messages:</Text>
      {request.messages?.map((msg, i) => (
        <View key={i} style={{ marginBottom: 5 }}>
          <Text>{msg.from}: {msg.content}</Text>
        </View>
      ))}

      {/* 🔹 Envoyer un message */}
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Votre message..."
        style={styles.input}
      />
      <Button title="Envoyer" onPress={sendMessage} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  image: { width: 150, height: 150, marginRight: 10, borderRadius: 8, resizeMode: "contain" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 8, marginVertical: 10, borderRadius: 5 },
});