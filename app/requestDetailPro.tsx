import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Button,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useApi } from "../services/api";

type MessageType = {
  from: { _id: string; name: string };
  content: string;
  createdAt: string;
  readBy: string[];
};

type ConversationType = {
  _id: string;
  messages: MessageType[];
};

type RequestType = {
  _id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  budget: number;
  client: { name: string };
  images?: { url: string }[];
  conversation?: ConversationType;
};

export default function RequestDetailPro() {
  const { apiFetch } = useApi();
  const params = useLocalSearchParams<{ id: string }>();
  const requestId = params.id;

  const [request, setRequest] = useState<RequestType | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [message, setMessage] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  // Charger utilisateur
  useEffect(() => {
    const fetchMe = async () => {
      const me = await apiFetch("/users/me");
      setCurrentUserId(me._id);
    };
    fetchMe();
  }, []);

  // Charger demande
  const fetchRequest = async () => {
    if (!requestId) return;
    try {
      const data = await apiFetch(`/requests/${requestId}`);
      setRequest(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  // Marquer messages comme lus
  useEffect(() => {
    const markAsRead = async () => {
      if (!request?.conversation?._id) return;
      try {
        await apiFetch(`/conversations/${request.conversation._id}/read`, {
          method: "POST",
        });
      } catch {}
    };
    markAsRead();
  }, [request?.conversation?._id]);

  // Envoyer message
  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      const res = await apiFetch(`/requests/${requestId}/message`, {
        method: "POST",
        body: JSON.stringify({ content: message }),
      });

      setRequest((prev) =>
        prev
          ? {
              ...prev,
              conversation: {
                ...prev.conversation!,
                messages: res.messages,
              },
            }
          : prev
      );
      setMessage("");
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      console.error(err);
    }
  };

  if (!request) return <Text>Chargement...</Text>;

  const messages = request.conversation?.messages || [];

  // Agrandir image
  const openImageModal = (uri: string) => {
    setModalImage(uri);
    setModalVisible(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        ref={scrollRef}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <Text style={styles.title}>{request.title}</Text>
        <Text>Catégorie: {request.category}</Text>
        <Text>Lieu: {request.location}</Text>
        <Text>Budget: {request.budget}€</Text>

        {request.images && request.images.length > 0 && (
          <>
            <Text style={{ marginTop: 10, fontWeight: "bold" }}>Images :</Text>
            <ScrollView horizontal style={{ marginVertical: 10 }}>
              {request.images.map((img, i) => (
                <TouchableOpacity key={i} onPress={() => openImageModal(img.url)}>
                  <Image
                    source={{ uri: img.url }}
                    style={{ width: 100, height: 100, marginRight: 10, borderRadius: 8 }}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.chatTitle}>Conversation avec {request.client.name}</Text>
        {messages.map((msg, i) => {
          const isMe = msg.from._id === currentUserId;
          let status = "";
          if (isMe) {
            if (msg.readBy.length === 1) status = "✓ envoyé";
            if (msg.readBy.length >= 2) status = "✓✓ lu";
          }

          return (
            <View
              key={i}
              style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}
            >
              {!isMe && <Text style={styles.author}>{msg.from.name}</Text>}
              <Text>{msg.content}</Text>
              {isMe && <Text style={styles.readStatus}>{status}</Text>}
            </View>
          );
        })}

        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Votre message..."
          style={styles.input}
        />
        <Button title="Envoyer" onPress={sendMessage} />
      </ScrollView>

      {/* Modal image */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalContent}>
            {modalImage && (
              <Image
                source={{ uri: modalImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
            <Button title="Fermer" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  chatTitle: { marginTop: 20, marginBottom: 10, fontWeight: "bold" },
  messageBubble: { padding: 10, borderRadius: 10, marginBottom: 8, maxWidth: "80%" },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#DCF8C6" },
  otherMessage: { alignSelf: "flex-start", backgroundColor: "#eee" },
  author: { fontWeight: "bold", marginBottom: 3 },
  readStatus: { fontSize: 10, marginTop: 4, color: "#777", alignSelf: "flex-end" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginTop: 10, borderRadius: 8 },

  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: width * 0.8,
    height: height * 0.5,
    marginBottom: 10,
  },
});