import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Button,
    FlatList,
    Image,
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
  pro?: { name: string; profileImage?: { url: string } };
  messages: MessageType[];
  conversationId?: string;
};

export default function RequestDetailPro() {
  const { apiFetch } = useApi();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [request, setRequest] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
  const fetchMe = async () => {
    try {
      const me = await apiFetch("/users/me");
      setCurrentUserId(me._id);
    } catch (err) {
      console.log("Erreur user", err);
    }
  };

  fetchMe();
}, []);

  // 🔹 Fetch request + messages
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

  // 🔹 Send message
  const sendMessage = async () => {
    if (!message.trim() || !request) return;

    try {
      const res = await apiFetch(`/requests/${request._id}/message`, {
        method: "POST",
body: JSON.stringify({
  content: message
})      });

      setRequest(prev =>
        prev ? { ...prev, messages: res.messages } : prev
      );

      setMessage("");

      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      console.error("Erreur envoi message:", err);
    }
  };

  if (loading) return <Text>Chargement...</Text>;
  if (!request) return <Text>Demande introuvable</Text>;

  return (
    <ScrollView
      style={{ padding: 20 }}
      ref={scrollViewRef}
      onContentSizeChange={() =>
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }
    >
      <Text style={styles.title}>{request.title}</Text>
      <Text>Catégorie: {request.category}</Text>
      <Text>Lieu: {request.location}</Text>
      <Text>Budget: {request.budget}€</Text>
      <Text>Description: {request.description || "Pas de description"}</Text>

      {/* Images */}
      {request.images?.length > 0 && (
        <FlatList
          horizontal
          data={request.images}
          keyExtractor={(_, i) => `${i}`}
          renderItem={({ item }) => (
            <Image source={{ uri: item.url }} style={styles.image} />
          )}
          style={{ marginVertical: 10 }}
        />
      )}

      {/* Messages */}
      <Text style={{ marginTop: 20, fontWeight: "bold", marginBottom: 5 }}>
        Messages :
      </Text>
      {request.messages?.map((msg, i) => {
  const isMe = msg.from._id === currentUserId;

  return (
    <View
      key={i}
      style={[
        styles.messageBubble,
        isMe ? styles.myMessage : styles.otherMessage
      ]}
    >
      <Text>{msg.content}</Text>
    </View>
  );
})}

      {/* Envoyer un message */}
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
  image: {
    width: 150,
    height: 150,
    marginRight: 10,
    borderRadius: 8,
    resizeMode: "contain",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    marginVertical: 10,
    borderRadius: 5,
  },
  messageBubble: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 5,
    marginBottom: 5,
  },
  messageAuthor: { fontWeight: "bold", marginBottom: 2 },
  myMessage: {
  alignSelf: "flex-end",
  backgroundColor: "#DCF8C6",
},

otherMessage: {
  alignSelf: "flex-start",
  backgroundColor: "#f0f0f0",
},
});