import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Image,
  Linking,
  Modal,
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
  profileImage?: {
    url: string;
  };
};
type MessageType = { from: UserType; content: string; createdAt: string; readBy: string[] };
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
     _id: string; clientValidated: boolean;
     proValidated: boolean;
      status: string;
       reviewByClient?: boolean;
reviewByPro?: boolean; };

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
  const [contact, setContact] = useState<{ phone?: string; email?: string } | null>(null);

  const [reviewModal, setReviewModal] = useState(false);
const [rating, setRating] = useState(5);
const [comment, setComment] = useState("");

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

  // Récupérer les coordonnées automatiquement après accord
  const dealAccepted =
    (conversation?.dealProposedByPro && conversation?.dealAcceptedByClient) ||
    (conversation?.dealProposedByClient && conversation?.dealAcceptedByPro);

  useEffect(() => {
    if (dealAccepted && conversation?._id) {
      const fetchContact = async () => {
        try {
          const res = await apiFetch(`/conversations/${conversation._id}/contact`);
          setContact(res);
        } catch (err) {
          console.log("Erreur récupération contact:", err);
        }
      };
      fetchContact();
    }
  }, [dealAccepted, conversation?._id]);

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
    params: {
      id: conversation.pro._id,
      conversationId: conversation._id
    }
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

    await apiFetch(
      `/conversations/${conversation._id}/accept-deal`,
      { method: "POST" }
    );

    Alert.alert("Accord accepté", "Vous avez accepté le deal");

    // 🔥 recharge tout
    await loadConversation();

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    Alert.alert("Erreur", msg);
  }
};

  const submitReview = async () => {
  if (!conversation || !request) return;

  try {
    const targetUser = conversation.pro?._id; // le pro à reviewer

    // 1️⃣ Envoyer l'avis
    await apiFetch(`/users/${targetUser}/review`, {
      method: "POST",
      body: JSON.stringify({
        score: rating,
        comment,
        requestId: request._id,
      }),
    });

    // 2️⃣ Mettre à jour la request (review-complete)
    await apiFetch(`/requests/${request._id}/review-complete`, {
      method: "POST",
      body: JSON.stringify({ proId: targetUser }),
    });

    // 3️⃣ Recharger la request pour UI
    const updatedRequest = await apiFetch(`/requests/${request._id}`);
    setRequest(updatedRequest);

    setReviewModal(false);
    Alert.alert("Merci !", "Votre avis a été enregistré");

  } catch (err) {
    console.log(err);
    Alert.alert(
      "Erreur",
      err instanceof Error ? err.message : "Impossible d'envoyer l'avis"
    );
  }
};

  if (loading) return <Text>Chargement...</Text>;
  if (!conversation) return <Text>Conversation introuvable</Text>;

  const clientProposed = conversation.dealProposedByClient && !conversation.dealAcceptedByClient;
  const proProposed = conversation.dealProposedByPro && !conversation.dealAcceptedByPro;

  const canReview = dealAccepted && !request?.reviewByClient;

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
      </View>

      {/* STATUT ACCORD */}
      {!dealAccepted && <Text style={styles.dealStatus}>Accord non validé — coordonnées bloquées</Text>}
      {dealAccepted && <Text style={styles.dealAccepted}>Accord validé 🎉</Text>}

      {/* COORDONNÉES */}
      {dealAccepted && contact && (
        <View style={styles.contactBox}>
          {contact.phone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${contact.phone}`)}>
              <Text style={styles.contactText}>📞 {contact.phone}</Text>
            </TouchableOpacity>
          )}
          {contact.email && (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${contact.email}`)}>
              <Text style={styles.contactText}>✉️ {contact.email}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

{canReview && (
<TouchableOpacity
style={styles.completeButton}
onPress={() => setReviewModal(true)}
>
<Text style={{color:"black"}}>Terminer la Mission</Text>
</TouchableOpacity>
)}

<Modal
visible={reviewModal}
transparent
animationType="slide"
>
<View style={styles.modalOverlay}>

<View style={styles.modal}>

<Text style={styles.modalTitle}>
Comment s'est passée la mission ?
</Text>

{/* étoiles */}

<View style={styles.stars}>
{[1,2,3,4,5].map((s)=>(
<TouchableOpacity key={s} onPress={()=>setRating(s)}>
<Text style={{fontSize:30}}>
{s <= rating ? "⭐" : "☆"}
</Text>
</TouchableOpacity>
))}
</View>

<TextInput
placeholder="Votre commentaire (optionnel)"
value={comment}
onChangeText={setComment}
style={styles.input}
/>

<Button
title="Envoyer l'avis"
onPress={submitReview}
/>

<Button
title="Fermer"
onPress={()=>setReviewModal(false)}
/>

</View>
</View>
</Modal>
      

      <View style={{ flexDirection: "row", alignItems: "center", padding: 10 }}>
  <Image
    source={{ uri: conversation.pro?.profileImage?.url }}
    style={{ width: 50, height: 50, borderRadius: 25, marginRight: 10 }}
  />
  <Text style={{ fontSize: 18, fontWeight: "bold" }}>{conversation.pro?.name}</Text>
</View>

       {/* MESSAGES */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {conversation.messages.map((msg, i) => {
  const isMe = msg.from._id === currentUserId;
const otherUserId =
  conversation.client?._id === currentUserId
    ? conversation.pro?._id
    : conversation.client?._id;

const isRead = msg.readBy?.includes(otherUserId || "");
  return (
    <View
      key={i}
      style={[
        styles.messageRow,
        isMe ? styles.myRow : styles.otherRow
      ]}
    >
      {!isMe && (
        <Image
          source={{
            uri: msg.from.profileImage?.url
          }}
          style={styles.avatar}
        />
      )}

      <View
        style={[
          styles.messageBubble,
          isMe ? styles.myMessage : styles.otherMessage
        ]}
      >
        {!isMe && <Text style={styles.author}>{msg.from.name}</Text>}

        <Text style={styles.messageText}>{msg.content}</Text>

        <View style={styles.messageFooter}>
          <Text style={styles.time}>
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </Text>

          {isMe && (
            <Text style={styles.readStatus}>
              {isRead ? "✓✓ lu" : "✓"}
            </Text>
          )}
        </View>
      </View>
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
  contactBox: { padding: 10, backgroundColor: "#f0f0f0", margin: 10, borderRadius: 8 },
  contactText: { fontSize: 16, marginBottom: 5 },
  messages: { flex: 1, padding: 15 },
  messageBubble: { padding: 10, borderRadius: 10, marginBottom: 8, maxWidth: "80%" },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#DCF8C6" },
  otherMessage: { alignSelf: "flex-start", backgroundColor: "#eee" },
  author: { fontWeight: "bold", marginBottom: 3 },
  inputContainer: { flexDirection: "row", padding: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginRight: 10, padding: 8 },
messageRow: {
  flexDirection: "row",
  marginBottom: 10,
  alignItems: "flex-end"
},

myRow: {
  justifyContent: "flex-end"
},

otherRow: {
  justifyContent: "flex-start"
},

avatar: {
  width: 32,
  height: 32,
  borderRadius: 16,
  marginRight: 6
},

messageText: {
  fontSize: 15
},

messageFooter: {
  flexDirection: "row",
  justifyContent: "flex-end",
  marginTop: 5
},

time: {
  fontSize: 10,
  color: "#777",
  marginRight: 4
},

readStatus: {
  fontSize: 10,
  color: "#007AFF"
},
modalOverlay:{
flex:1,
backgroundColor:"rgba(0,0,0,0.5)",
justifyContent:"center",
alignItems:"center"
},

modal:{
backgroundColor:"white",
padding:20,
borderRadius:10,
width:"85%"
},

modalTitle:{
fontSize:18,
fontWeight:"bold",
marginBottom:15,
textAlign:"center"
},

stars:{
flexDirection:"row",
justifyContent:"center",
marginBottom:20
},

completeButton:{
backgroundColor:"#28a745",
padding:12,
borderRadius:8,
alignItems:"center",
margin:10
}
});