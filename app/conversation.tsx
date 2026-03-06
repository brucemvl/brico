import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Button,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { useApi } from "../services/api";

type MessageType = {
  _id?: string;
  from: {
    _id: string;
    name: string;
    profileImage?: { url: string };
  };
  content: string;
  createdAt?: string;
};

type ConversationType = {
  _id: string;
  messages: MessageType[];
  pro?: {
    name: string;
    profileImage?: { url: string };
  };
  client?: {
    name: string;
    profileImage?: { url: string };
  };
};

export default function Conversation() {
  const { apiFetch } = useApi();
  const params = useLocalSearchParams<{ id: string }>();
  const conversationId = params.id;

  const [conversation, setConversation] = useState<ConversationType | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const [currentUserId, setCurrentUserId] = useState("");

  // 🔹 Charger utilisateur
  useEffect(() => {
    const loadUser = async () => {
      const me = await apiFetch("/users/me");
      setCurrentUserId(me._id);
    };

    loadUser();
  }, []);

  // 🔹 Charger conversation
  useEffect(() => {
    if (!conversationId) return;

    const fetchConversation = async () => {
      try {
        const data = await apiFetch(`/conversations/${conversationId}`);
        setConversation(data);
      } catch (err) {
        console.error("Erreur conversation:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId]);

  // 🔹 Envoyer message
  const sendMessage = async () => {
    if (!message.trim() || !conversation) return;

    try {
      const res = await apiFetch(`/conversations/${conversation._id}/message`, {
        method: "POST",
        body: JSON.stringify({ content: message }),
      });

      setConversation((prev) =>
        prev ? { ...prev, messages: res.messages } : prev
      );

      setMessage("");

      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      console.error("Erreur message:", err);
    }
  };

  if (loading) return <Text>Chargement...</Text>;
  if (!conversation) return <Text>Conversation introuvable</Text>;

  return (
    <ScrollView
      style={styles.container}
      ref={scrollRef}
      onContentSizeChange={() =>
        scrollRef.current?.scrollToEnd({ animated: true })
      }
    >
      {/* Messages */}
      {conversation.messages?.map((msg, i) => {
        const isMe = msg.from._id === currentUserId;

        return (
          <View
            key={i}
            style={[
              styles.messageBubble,
              isMe ? styles.myMessage : styles.otherMessage,
            ]}
          >
            {!isMe && (
              <Text style={styles.author}>{msg.from.name}</Text>
            )}

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
  container: {
    padding: 20,
  },

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