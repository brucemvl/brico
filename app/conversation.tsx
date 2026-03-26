import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Button,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import fond from "../assets/convert_1.png";
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

type AssignedPro = {
  pro: string | { _id: string; name?: string; profileImage?: { url?: string } };
  reviewByClient?: boolean;
  reviewByPro?: boolean;
  status?: "active" | "completed" | "cancelled";
  completedAt?: string;
  cancelledAt?: string;
};

type RequestType = {
     _id: string; clientValidated: boolean;
     proValidated: boolean;
      status: string;
       reviewByClient?: boolean;
reviewByPro?: boolean;
assignedPros?: AssignedPro[];
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
  const [contact, setContact] = useState<{ phone?: string; email?: string } | null>(null);

  const [reviewModal, setReviewModal] = useState(false);
const [rating, setRating] = useState(5);
const [comment, setComment] = useState("");

const reviewScale = useRef(new Animated.Value(1)).current;

  const scrollRef = useRef<ScrollView | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 1.3, 
      useNativeDriver: true,
      friction: 4,
      tension: 100,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1, // Retour à la taille normale
      useNativeDriver: true,
      friction: 4,
      tension: 100,
    }).start();
  };

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

   useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(reviewScale, {
          toValue: 1.06,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(reviewScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
  
    animation.start();
  
    return () => {
      animation.stop();
    };
  }, []);

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
  if (!request?._id || !conversation?.pro?._id) return;

  try {
    await apiFetch(`/requests/${request._id}/propose-deal`, {
      method: "POST",
      body: JSON.stringify({ proId: conversation.pro._id }),
    });

    Alert.alert("Accord proposé", "En attente de validation par l'autre utilisateur");
    await loadConversation();
  } catch (err) {
    console.log(err);
    Alert.alert(
      "Erreur",
      err instanceof Error ? err.message : "Impossible de proposer l'accord"
    );
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
  if (!conversation || !request || !conversation.pro?._id) return;

  try {
    const targetUser = conversation.pro._id;

    await apiFetch(`/users/${targetUser}/review`, {
      method: "POST",
      body: JSON.stringify({
        score: rating,
        comment,
        requestId: request._id,
      }),
    });

    await apiFetch(`/requests/${request._id}/review-complete`, {
      method: "POST",
      body: JSON.stringify({ proId: targetUser }),
    });

    setReviewModal(false);
    Alert.alert("Merci !", "Votre avis a été enregistré");

    await loadConversation();
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


  const getProId = (pro: string | { _id: string } | undefined) => {
  if (!pro) return "";
  return typeof pro === "string" ? pro : pro._id;
};

  // Pour savoir si le client a déjà noté ce pro
const currentProId = getProId(conversation?.pro);

const currentAssignment =
  request?.assignedPros?.find(
    ap => getProId(ap.pro) === currentProId
  ) ?? null;

const clientHasReviewed = currentAssignment?.reviewByClient ?? false;
const proHasReviewed = currentAssignment?.reviewByPro ?? false;
const missionCompleted = clientHasReviewed && proHasReviewed;

const clientProposed =
  !!conversation.dealProposedByClient && !conversation.dealAcceptedByClient;

const proProposed =
  !!conversation.dealProposedByPro && !conversation.dealAcceptedByPro;

const canReview = !!currentAssignment && dealAccepted && !clientHasReviewed;

  return (
    
    <ImageBackground source={fond} style={{flex: 1, paddingTop: 60, paddingBottom: 30, paddingInline: 0, alignItems: "center"}}>
      <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={85} // ajuste selon ton header
    >
      {/* ACTIONS */}
      
      <View style={styles.actions}>

        {!clientProposed && !proProposed && !dealAccepted && (
          <TouchableOpacity style={styles.button} onPress={proposeDeal}>
            <Text style={styles.buttonText}>Proposer accord</Text>
          </TouchableOpacity>
        )}

        {proProposed && !dealAccepted && (
          <TouchableOpacity style={styles.button} onPress={acceptDeal}>
            <Animated.Text
                  style={{
                    color: "#fefefe",
                    fontFamily: "Mont",
                    transform: [{ scale: reviewScale }],
                  }}
                >
            <Text style={styles.buttonText}>Accepter accord</Text>
            </Animated.Text>
          </TouchableOpacity>
        )}
      </View>

      {/* STATUT ACCORD */}
      {!dealAccepted && <Text style={styles.dealStatus}>Accord non validé — coordonnées bloquées</Text>}
      {dealAccepted && <Text style={styles.dealAccepted}>Accord validé 🤝</Text>}

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

{dealAccepted && !missionCompleted && clientHasReviewed && (
  <Text style={{ textAlign: "center", margin: 10, color: "#555" }}>
    ✅ Avis envoyé ! En attente que le pro note.
  </Text>
)}

{canReview && (
  <TouchableOpacity
    style={styles.completeButton}
    onPress={() => setReviewModal(true)}
  >
    <Text style={{ color: "#fff", fontFamily: "Montt" }}>Terminer la mission</Text>
  </TouchableOpacity>
)}

{missionCompleted && (
  <Text style={{ textAlign: "center", margin: 10, color: "green", fontFamily: "Kanitt" }}>
    🎉 Mission terminée !
  </Text>
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
      

      <View style={{ flexDirection: "row", alignItems: "center", paddingBlock: 10, paddingInline: 30, justifyContent: "space-between"}}>
        <View style={{flexDirection: "row", alignItems: "center"}}>
  <Image
    source={{ uri: conversation.pro?.profileImage?.url }}
    style={{ width: 50, height: 50, borderRadius: 25, marginRight: 10 }}
  />
  <Text style={{ fontSize: 18, fontFamily: "Montt" }}>{conversation.pro?.name}</Text>
  </View>
<TouchableWithoutFeedback
    accessible
  accessibilityRole="button"
  accessibilityLabel="Profil"
  accessibilityHint={`Voir le profil de ${conversation?.pro?.name}`}
      onPress={openProfile}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <LinearGradient colors={["#30a590", "#1a5b4f"]} style={{ padding: 12, marginBottom: 20, backgroundColor: "#1a5b4f", borderRadius: 14 }}>
                  <Text style={styles.buttonText}>Voir profil</Text>
                  </LinearGradient>
                  </Animated.View>
        </TouchableWithoutFeedback>
</View>

       {/* MESSAGES */}
       <LinearGradient colors={["#cecececb", "#7f7f7fec"]} style={{flex: 1, borderRadius: 20, padding: 4}}>
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
      </LinearGradient>

      {/* INPUT */}
      <View style={styles.inputContainer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Votre message..."
          style={styles.input}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.button}>
          <Text style={{fontFamily: "Kanit", color: "#fff"}}>Envoyer</Text>
        </TouchableOpacity>
      </View>
          </KeyboardAvoidingView>

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", justifyContent: "space-around", padding: 10 },
  button: { backgroundColor: "#007AFF", padding: 10, borderRadius: 14 },
  buttonText: { color: "white", fontFamily: "Mont" },
  dealStatus: { textAlign: "center", color: "#1a5b4f", marginBottom: 5, fontFamily: "Mont" },
  dealAccepted: { textAlign: "center", color: "green", fontFamily: "Kanito", marginBottom: 5 },
  contactBox: { padding: 10, backgroundColor: "#f0f0f0", margin: 10, borderRadius: 8 },
  contactText: { fontSize: 16, marginBottom: 5 },
  messages: {  padding: 15 },
  messageBubble: { padding: 10, borderRadius: 10,  maxWidth: "80%" },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#DCF8C6" },
  otherMessage: { alignSelf: "flex-start", backgroundColor: "#eee" },
  author: { fontFamily: "Londrinak", marginBottom: 3 },
  inputContainer: { flexDirection: "row", padding: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", backgroundColor: "#fff", fontFamily: "Mont", borderRadius: 8, marginRight: 10, padding: 8 },
messageRow: {
  flexDirection: "row",
  marginBottom: 10,
  alignItems: "flex-end"
},

myRow: {
  justifyContent: "flex-end"
},

otherRow: {
  justifyContent: "flex-start",
},

avatar: {
  width: 32,
  height: 32,
  borderRadius: 16,
  marginRight: 6
},

messageText: {
fontFamily: "Mont",
 letterSpacing: -0.6  
},

messageFooter: {
  flexDirection: "row",
  justifyContent: "flex-end",
  marginTop: 5
},

time: {
  fontSize: 10,
  color: "#777",
  marginRight: 4,
  fontFamily: "Londrina"
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
backgroundColor: "#007AFF",
padding:10,
borderRadius:14,
alignItems:"center",
margin:10,
 width: 260,
 alignSelf: "center"
}
});