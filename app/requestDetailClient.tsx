import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
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

type ConversationType = {
  _id: string;
  pro: {
    _id: string;
    name: string;
    profileImage?: { url: string };
  };
  messages: MessageType[];
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
  conversations: ConversationType[];
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
body: JSON.stringify({
  content: message,
  proId: request.pro?._id
})
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

      <Text style={{ marginTop: 20, fontWeight: "bold" }}>
Conversations avec les pros
</Text>

{request.conversations?.map(conv => (
  <TouchableOpacity
    key={conv._id}
    style={styles.conversationCard}
    onPress={() =>
      router.push({
        pathname: "/conversation",
        params: { id: conv._id }
      })
    }
  >
    {conv.pro.profileImage?.url && (
      <Image
        source={{ uri: conv.pro.profileImage.url }}
        style={styles.avatar}
      />
    )}

    <View>
      <Text style={{ fontWeight: "bold" }}>{conv.pro.name}</Text>

      {conv.messages?.length > 0 && (
        <Text numberOfLines={1}>
          {conv.messages[conv.messages.length - 1].content}
        </Text>
      )}
    </View>
  </TouchableOpacity>
))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "bold" },
  image: { width: 150, height: 150, marginRight: 10, borderRadius: 8, resizeMode: "contain" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 8, marginVertical: 10, borderRadius: 5 },
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
  unreadText: { color: "white", fontSize: 12, fontWeight: "bold" },
  conversationCard: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  padding: 10,
  borderWidth: 1,
  borderRadius: 10,
  marginTop: 10
},

avatar: {
  width: 40,
  height: 40,
  borderRadius: 20
}
});