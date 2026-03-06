import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
  readBy: string[]; // IDs des utilisateurs ayant lu le message
  createdAt: string;
};

type ConversationType = {
  _id: string;
  pro: UserType;
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
  conversations: ConversationType[];
};

export default function RequestDetailClient() {
  const { apiFetch } = useApi();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;

  const [request, setRequest] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Refetch à chaque focus pour mettre à jour badges
  useFocusEffect(
    useCallback(() => {
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
    }, [id])
  );

  if (loading) return <Text>Chargement...</Text>;
  if (!request) return <Text>Demande introuvable</Text>;

  return (
    <ScrollView style={{ padding: 20 }}>
      {/* Titre */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <Text style={styles.title}>{request.title}</Text>
      </View>

      {/* Infos */}
      <Text>Catégorie: {request.category}</Text>
      <Text>Lieu: {request.location}</Text>
      <Text>Budget: {request.budget}€</Text>
      <Text>Description: {request.description || "Pas de description"}</Text>

      {/* Images */}
      {request.images?.length > 0 && (
        <FlatList
          horizontal
          data={request.images}
          keyExtractor={(item, i) => `${i}`}
          renderItem={({ item }) => <Image source={{ uri: item.url }} style={styles.image} />}
          style={{ marginVertical: 10 }}
        />
      )}

      {/* Conversations */}
      <Text style={{ marginTop: 20, fontWeight: "bold" }}>Conversations avec les pros</Text>

      {request.conversations?.map(conv => {
        // 🔹 Nombre de messages non lus côté client
        const unread = conv.messages?.filter(
          m => !m.readBy?.includes(request.client._id) && m.from._id !== request.client._id
        ).length || 0;

        const openConversation = async () => {
          // 1️⃣ Marquer les messages comme lus côté backend
          try {
            await apiFetch(`/conversations/${conv._id}/mark-read`, { method: "POST" });
          } catch (err) {
            console.error("Erreur mark-read:", err);
          }

          // 2️⃣ Naviguer vers la conversation
          router.push({
            pathname: "/conversation",
            params: { id: conv._id }
          });

          // 3️⃣ Mettre à jour les badges côté frontend
          setRequest(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              conversations: prev.conversations.map(c =>
                c._id === conv._id
                  ? { ...c, messages: c.messages.map(m => ({ ...m, readBy: [...m.readBy, request.client._id] })) }
                  : c
              )
            };
          });
        };

        return (
          <TouchableOpacity
            key={conv._id}
            style={styles.conversationCard}
            onPress={openConversation}
          >
            {conv.pro.profileImage?.url && (
              <Image source={{ uri: conv.pro.profileImage.url }} style={styles.avatar} />
            )}

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "bold" }}>{conv.pro.name}</Text>
              {conv.messages?.length > 0 && (
                <Text numberOfLines={1}>
                  {conv.messages[conv.messages.length - 1].content}
                </Text>
              )}
            </View>

            {/* 🔴 Badge non lu */}
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "bold" },
  image: { width: 150, height: 150, marginRight: 10, borderRadius: 8, resizeMode: "contain" },
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
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 10
  },
  avatar: { width: 40, height: 40, borderRadius: 20 }
});