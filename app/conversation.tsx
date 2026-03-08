import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Button,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useApi } from "../services/api";

type UserType = {
  _id: string;
  name: string;
};

type MessageType = {
  from: UserType;
  content: string;
  createdAt: string;
  readBy: string[];
};

type ConversationType = {
  _id: string;
  request: string;
  messages: MessageType[];
  pro?: UserType;
  client?: UserType;
  dealProposedByClient?: boolean;
  dealProposedByPro?: boolean;
  dealAcceptedByClient?: boolean;
  dealAcceptedByPro?: boolean;
};

type RequestType = {
  _id: string;
  clientValidated: boolean;
  proValidated: boolean;
  status: string;
};

export default function Conversation() {
  const { apiFetch } = useApi();
  const router = useRouter();
  const params = useLocalSearchParams();
  const conversationId = params.id as string;

  const [conversation, setConversation] = useState<ConversationType | null>(null);
  const [request, setRequest] = useState<RequestType | null>(null);
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<ScrollView | null>(null);

  // Charger utilisateur
  useEffect(() => {
    const loadUser = async () => {
      const me = await apiFetch("/users/me");
      setCurrentUserId(me._id);
    };
    loadUser();
  }, []);

  // Charger conversation et request
  const loadConversation = async () => {
    if (!conversationId) return;
    try {
      const data: ConversationType = await apiFetch(`/conversations/${conversationId}`);
      setConversation(data);

      if (data.request) {
        const req: RequestType = await apiFetch(`/requests/${data.request}`);
        setRequest(req);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  // Envoyer message
  const sendMessage = async () => {
    if (!message.trim() || !conversation?._id) return;

    try {
      const res = await apiFetch(`/conversations/${conversation._id}/message`, {
        method: "POST",
        body: JSON.stringify({ content: message })
      });

      setConversation(prev => prev ? { ...prev, messages: res.messages } : prev);
      setMessage("");

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      Alert.alert("Erreur", msg);
    }
  };

  // Voir profil pro
  const openProfile = () => {
    if (!conversation?.pro?._id) return;
    router.push({
      pathname: "/profile",
      params: { id: conversation.pro._id }
    });
  };

  // Proposer accord
  const proposeDeal = async () => {
    if (!conversation?._id) return;
    try {
      await apiFetch(`/conversations/${conversation._id}/propose-deal`, { method: "POST" });
      Alert.alert("Accord proposé", "En attente de validation par l'autre utilisateur");
      loadConversation();
    } catch (err) {
      console.log(err);
    }
  };

  // Accepter accord
  const acceptDeal = async () => {
  if (!conversation?._id) return;

  try {
    const updatedConversation: ConversationType = await apiFetch(
      `/conversations/${conversation._id}/accept-deal`,
      { method: "POST" }
    );

    // Mettre à jour la conversation
    setConversation(updatedConversation);

    // Debug
    console.log("Updated conversation after accept:", updatedConversation);

    Alert.alert("Accord accepté", "Vous avez accepté le deal");

  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    Alert.alert("Erreur", msg);
  }
};

  // Voir coordonnées
  const getContact = async () => {
    if (!conversation?._id) return;
    try {
      const res = await apiFetch(`/conversations/${conversation._id}/contact`);
      Alert.alert("Coordonnées", `Téléphone : ${res.phone}\nEmail : ${res.email}`);
    } catch {
      Alert.alert("Accord non validé", "Les deux utilisateurs doivent accepter l'accord");
    }
  };

  if (loading) return <Text>Chargement...</Text>;
  if (!conversation) return <Text>Conversation introuvable</Text>;

const dealAccepted =
  (conversation.dealProposedByPro && conversation.dealAcceptedByClient) || 
  (conversation.dealProposedByClient && conversation.dealAcceptedByPro);
    const clientProposed = conversation.dealProposedByClient && !conversation.dealAcceptedByClient;
  const proProposed = conversation.dealProposedByPro && !conversation.dealAcceptedByPro;

  return (
    <View style={{ flex: 1, paddingTop: 40 }}>
      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={openProfile}>
          <Text style={styles.buttonText}>Voir profil</Text>
        </TouchableOpacity>

        {!clientProposed && !proProposed && !dealAccepted && (
          <TouchableOpacity style={styles.button} onPress={proposeDeal}>
            <Text style={styles.buttonText}>Proposer accord</Text>
          </TouchableOpacity>
        )}

        {proProposed && !dealAccepted && (
          <TouchableOpacity style={styles.button} onPress={acceptDeal}>
            <Text style={styles.buttonText}>Accepter accord</Text>
          </TouchableOpacity>
        )}

        {dealAccepted && (
          <TouchableOpacity style={styles.button} onPress={getContact}>
            <Text style={styles.buttonText}>Voir coordonnées</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* STATUT ACCORD */}
      {!dealAccepted && <Text style={styles.dealStatus}>Accord non validé — coordonnées bloquées</Text>}
      {dealAccepted && <Text style={styles.dealAccepted}>Accord validé 🎉</Text>}

      {/* MESSAGES */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {conversation.messages.map((msg, i) => {
          const isMe = msg.from._id === currentUserId;
          return (
            <View
              key={i}
              style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}
            >
              {!isMe && <Text style={styles.author}>{msg.from.name}</Text>}
              <Text>{msg.content}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* INPUT */}
      <View style={styles.inputContainer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Votre message..."
          style={styles.input}
        />
        <Button title="Envoyer" onPress={sendMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", justifyContent: "space-around", padding: 10 },
  button: { backgroundColor: "#007AFF", padding: 10, borderRadius: 8 },
  buttonText: { color: "white", fontWeight: "bold" },
  dealStatus: { textAlign: "center", color: "#888", marginBottom: 5 },
  dealAccepted: { textAlign: "center", color: "green", fontWeight: "bold", marginBottom: 5 },
  messages: { flex: 1, padding: 15 },
  messageBubble: { padding: 10, borderRadius: 10, marginBottom: 8, maxWidth: "80%" },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#DCF8C6" },
  otherMessage: { alignSelf: "flex-start", backgroundColor: "#eee" },
  author: { fontWeight: "bold", marginBottom: 3 },
  inputContainer: { flexDirection: "row", padding: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginRight: 10, padding: 8 },
});