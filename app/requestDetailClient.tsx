import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Button,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { useApi } from "../services/api";

type UserType = {
  _id: string;
  name: string;
  profileImage?: { url: string };
};

type MessageType = {
  from: UserType;
  content: string;
  readByClient: boolean;
  createdAt: string;
};

type RequestType = {
  _id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  budget: number;
  status: string;
  images?: { url: string }[];
  client: UserType;
  pro?: UserType;
  messages?: MessageType[];
  prosInConversation?: UserType[];
};

export default function RequestDetailClient() {
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

  // 🔹 Compte messages non lus par le client
  const unreadCount = request.messages?.filter(m => !m.readByClient && m.from._id !== request.client._id).length || 0;

  return (
    <ScrollView style={{ padding: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <Text style={styles.title}>{request.title}</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </View>

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
          style={{ marginVertical: 10 }}
        />
      )}

      {/* 🔹 Messages */}
      <Text style={{ fontWeight: "bold", marginTop: 20 }}>Messages :</Text>
      {request.messages?.map((msg, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: 5, alignItems: "center" }}>
          {msg.from.profileImage?.url && (
            <Image source={{ uri: msg.from.profileImage.url }} style={styles.avatar} />
          )}
          <View style={{ marginLeft: 8 }}>
            <Text style={{ fontWeight: "bold" }}>{msg.from.name}</Text>
            <Text>{msg.content}</Text>
            {!msg.readByClient && msg.from._id !== request.client._id && (
              <View style={styles.redDot} />
            )}
          </View>
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
  title: { fontSize: 22, fontWeight: "bold" },
  image: { width: 150, height: 150, marginRight: 10, borderRadius: 8, resizeMode: "contain" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 8, marginVertical: 10, borderRadius: 5 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "red", marginTop: 2 },
  unreadBadge: {
    backgroundColor: "red",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8
  },
  unreadText: { color: "white", fontSize: 12, fontWeight: "bold" }
});