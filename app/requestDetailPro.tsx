import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Button,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useApi } from "../services/api";

type MessageType = {
  from: { _id: string; name: string; profileImage?: { url: string } };
  content: string;
  createdAt: string;
};

type ConversationType = {
  _id: string;
  messages: MessageType[];
  client: { name: string; profileImage?: { url: string } };
  pro: { _id: string; name: string; profileImage?: { url: string } };
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
  client: { name: string; profileImage?: { url: string } };
  conversation?: ConversationType; // conversation du pro
};

export default function RequestDetailPro() {
  const { apiFetch } = useApi();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;

  const [request, setRequest] = useState<RequestType | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  // 🔹 Charger l'utilisateur connecté
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const me = await apiFetch("/users/me");
        setCurrentUserId(me._id);
      } catch (err) {
        console.error("Erreur fetch user:", err);
      }
    };
    fetchMe();
  }, []);

  // 🔹 Charger la demande + conversation du pro
  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      try {
        const data = await apiFetch(`/requests/${id}`);
        setRequest(data);
      } catch (err) {
        console.error("Erreur fetch request:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  // 🔹 Envoyer un message
  const sendMessage = async () => {
    if (!message.trim() || !request?.conversation) return;

    try {
      const res = await apiFetch(`/requests/${request._id}/message`, {
        method: "POST",
        body: JSON.stringify({ content: message }),
      });

      setRequest((prev) =>
        prev && prev.conversation
          ? {
              ...prev,
              conversation: {
                ...prev.conversation,
                messages: res.messages,
              },
            }
          : prev
      );

      setMessage("");
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      console.error("Erreur envoi message:", err);
    }
  };

  if (loading) return <Text>Chargement...</Text>;
  if (!request) return <Text>Demande introuvable</Text>;
  if (!request.conversation) return <Text>Aucune conversation disponible</Text>;

  return (
    <ScrollView
      style={{ padding: 20 }}
      ref={scrollRef}
      onContentSizeChange={() =>
        scrollRef.current?.scrollToEnd({ animated: true })
      }
    >
      <Text style={styles.title}>{request.title}</Text>
      <Text>Catégorie: {request.category}</Text>
      <Text>Lieu: {request.location}</Text>
      <Text>Budget: {request.budget}€</Text>
      <Text>Description: {request.description || "Pas de description"}</Text>

      {/* Messages */}
      <Text style={{ marginTop: 20, fontWeight: "bold", marginBottom: 5 }}>
        Conversation avec {request.client.name} :
      </Text>

      {request.conversation.messages.map((msg, i) => {
        const isMe = msg.from._id === currentUserId;

        return (
          <View
            key={i}
            style={[
              styles.messageBubble,
              isMe ? styles.myMessage : styles.otherMessage,
            ]}
          >
            {!isMe && <Text style={styles.author}>{msg.from.name}</Text>}
            <Text>{msg.content}</Text>
          </View>
        );
      })}

      {/* Input */}
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
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    maxWidth: "80%",
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#eee",
  },
  author: {
    fontWeight: "bold",
    marginBottom: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
  },
});