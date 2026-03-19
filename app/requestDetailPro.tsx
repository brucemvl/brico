import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useApi } from "../services/api";

type MessageType = {
  from: { _id: string; name: string; profileImage?: string };
  content: string;
  createdAt: string;
  readBy: string[];
};

type ConversationType = {
  _id: string;
  messages: MessageType[];
  dealProposedByClient?: boolean;
  dealProposedByPro?: boolean;
  dealAcceptedByClient?: boolean;
  dealAcceptedByPro?: boolean;
};

type RequestType = {
  _id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  budget: number;
  client: { _id: string; name: string; profileImage?: string; phone?: string; email?: string };
  conversation?: ConversationType;
  images?: { url: string }[];
  status: string;
  reviewByClient?: boolean;
  reviewByPro?: boolean;
};

export default function RequestDetailPro() {
  const { apiFetch } = useApi();
  const params = useLocalSearchParams<{ id: string }>();
  const requestId = params.id;

  const [request, setRequest] = useState<RequestType | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [message, setMessage] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const [contact, setContact] = useState<{ phone?: string; email?: string } | null>(null);

  const [reviewModal, setReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  // Images preview
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const scrollY = new Animated.Value(0);
    
      const headerOpacity = scrollY.interpolate({
      inputRange: [0, 60],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });
    
    const fadeOut = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    
    const translateY = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [0, -40],
      extrapolate: "clamp",
    });
    
    const scale = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [1, 0.90],
      extrapolate: "clamp",
    });

  // Charger utilisateur
  useEffect(() => {
    const fetchMe = async () => {
      const me = await apiFetch("/users/me");
      setCurrentUserId(me._id);
    };
    fetchMe();
  }, []);

  const dealAccepted =
    (request?.conversation?.dealProposedByPro && request?.conversation?.dealAcceptedByClient) ||
    (request?.conversation?.dealProposedByClient && request?.conversation?.dealAcceptedByPro);

  useEffect(() => {
    const fetchContact = async () => {
      if (dealAccepted) {
        try {
          const res = await apiFetch(`/requests/${requestId}/contact`);
          setContact({ phone: res.phone, email: res.email });
        } catch {
          setContact(null);
        }
      }
    };
    fetchContact();
  }, [dealAccepted, requestId]);

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
        await apiFetch(`/conversations/${request.conversation._id}/mark-read`, { method: "POST" });
      } catch {}
    };
    markAsRead();
  }, [request?.conversation?._id]);

  const proposeDeal = async () => {
    if (!request?.conversation?._id) return;
    try {
      await apiFetch(`/conversations/${request.conversation._id}/propose-deal`, { method: "POST" });
      fetchRequest();
    } catch (err) {
      console.error(err);
    }
  };

  const acceptDeal = async () => {
    if (!request?.conversation?._id) return;
    try {
      await apiFetch(`/conversations/${request.conversation._id}/accept-deal`, { method: "POST" });
      Alert.alert("Accord accepté", "Vous avez accepté le deal");
      fetchRequest();
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Impossible d'accepter le deal");
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      const res = await apiFetch(`/requests/${requestId}/message`, {
        method: "POST",
        body: JSON.stringify({ content: message }),
      });
      setRequest(prev =>
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

  const submitReview = async () => {
    if (!request) return;
    try {
      await apiFetch(`/users/${request.client._id}/review`, {
        method: "POST",
        body: JSON.stringify({
          score: rating,
          comment,
          requestId: request._id,
        }),
      });
      setReviewModal(false);
      Alert.alert("Merci !", "Votre avis a été enregistré");
    } catch (err) {
      console.log(err);
      Alert.alert("Erreur", "Impossible d'envoyer l'avis");
    }
  };

  const openPreview = (url: string) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  };

  if (!request) return <Text>Chargement...</Text>;

  const messages = request.conversation?.messages || [];

  const canReview =
    request?.status === "in_progress" && dealAccepted &&
    !request.reviewByPro;

  const clientProposed =
    request?.conversation?.dealProposedByClient && !request?.conversation?.dealAcceptedByClient;
  const proProposed =
    request?.conversation?.dealProposedByPro && !request?.conversation?.dealAcceptedByPro;

  return (
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={85} // ajuste selon ton header
>
  <View style={{  }}>
          <Animated.Text style={{ fontFamily: "Montt", opacity: headerOpacity, marginTop: 50, marginLeft: 10 }}>{request.title}</Animated.Text>
      <Animated.ScrollView
        contentContainerStyle={styles.container}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={6}
        
      > 
      <Animated.View
        style={{
          alignItems: "center",
          marginBlock: 10,
          justifyContent: "center",
          width: "100%",
          opacity: fadeOut,
          transform: [{ translateY }, { scale }],
          flexDirection: "row",
          
        }}
      >
        <LinearGradient colors={["#5ce757",  "#3e9040", "#3e9040"]} style={{padding: 20, gap: 5, borderRadius: 20, width: "100%"}}>
                  <Text style={styles.title}>{request.title}</Text>
        <Text style={{fontFamily: "Montt", color: "#fff"}}>Catégorie: {request.category}</Text>
        <Text style={{fontFamily: "Montt", color: "#fff"}}>Lieu: {request.location}</Text>
        <Text style={{fontFamily: "Montt", color: "#fff"}}>Budget: {request.budget}€</Text>
        </LinearGradient>
        </Animated.View>
        {request.description && <View style={{alignItems: "center", gap: 10}}>
          <Text style={{fontFamily: "Montt", fontSize: 20, marginTop: 10, textAlign: "center"}}>Description</Text>
        <Text  style={{fontFamily: "Londrina", fontSize: 16, color: "#3e9040"}}>{request.description}</Text>
        </View>}

        {/* 🔹 Images du client */}
        {request.images && request.images.length > 0 && (
          <ScrollView horizontal style={{ marginVertical: 10, backgroundColor: "#3e9040", padding: 10, borderRadius: 20 }} contentContainerStyle={{justifyContent: "center", alignItems: "center"}}>
            {request.images.map((img, idx) => (
              <TouchableOpacity key={idx} onPress={() => openPreview(img.url)} style={{ marginRight: 10 }}>
                <Image source={{ uri: img.url }} style={{ width: 130, height: 130, borderRadius: 8 }} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Coordonnées après accord */}
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

        {/* Actions deal */}
        <View style={styles.dealBox}>
          {!clientProposed && !proProposed && !dealAccepted && (
            <TouchableOpacity onPress={proposeDeal} style={{backgroundColor: "#007AFF", width: 160, padding: 10, alignItems: "center", justifyContent: "center", borderRadius: 20}}>
              <Text style={styles.dealAction}>Proposer un accord</Text>
            </TouchableOpacity>
          )}
          {clientProposed && !dealAccepted && (
            <TouchableOpacity onPress={acceptDeal}>
              <Text style={styles.dealAction}>Accepter l'accord proposé par le client</Text>
            </TouchableOpacity>
          )}
          {proProposed && !dealAccepted && <Text style={styles.dealStatus}>Vous avez proposé un accord — en attente du client</Text>}
          {dealAccepted && <Text style={styles.dealStatus}>✅ Accord validé</Text>}
        </View>

        {canReview && (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => setReviewModal(true)}
          >
            <Text style={{ color: "#220303", fontFamily: "Mont" }}>Donner un avis ⭐</Text>
          </TouchableOpacity>
        )}

        {/* Modal review */}
        <Modal visible={reviewModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Comment s'est passé ce client ?</Text>
              <View style={styles.stars}>
                {[1,2,3,4,5].map((s)=>(
                  <TouchableOpacity key={s} onPress={()=>setRating(s)}>
                    <Text style={{fontSize:30}}>{s <= rating ? "⭐" : "☆"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                placeholder="Commentaire (optionnel)"
                value={comment}
                onChangeText={setComment}
                style={styles.input}
              />
              <TouchableOpacity style={styles.sendReview} onPress={submitReview}>
                <Text style={{color:"#fff", fontFamily: "Mont"}}>Envoyer l'avis</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>setReviewModal(false)}>
                <Text style={{textAlign:"center", marginTop:10, fontFamily: "Mont"}}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Messages */}
        <Text style={styles.chatTitle}>Conversation avec {request.client.name}</Text>
        {messages.map((msg, i) => {
          const isMe = msg.from._id === currentUserId;
          let status = "";
          if (isMe) {
            if (msg.readBy.length === 1) status = "✓ envoyé";
            if (msg.readBy.length >= 2) status = "✓✓ lu";
          }
          const msgTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <View key={i} style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
              {!isMe && request.client?.profileImage && (
                <Image source={{ uri: request.client?.profileImage?.url }} style={styles.avatar} />
              )}
              <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
                {!isMe && <Text style={styles.author}>{msg.from.name}</Text>}
                <Text style={{fontFamily: "Mont", letterSpacing: -0.6}}>{msg.content}</Text>
                <View style={styles.messageMeta}>
                  <Text style={styles.time}>{msgTime}</Text>
                  {isMe && <Text style={styles.readStatus}>{status}</Text>}
                </View>
              </View>
            </View>
          );
        })}

        <View style={styles.inputRow}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Votre message..."
            style={styles.input}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Text style={{ color: "#fff" }}>Envoyer</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* Modal preview image */}
      <Modal visible={previewVisible} transparent animationType="fade">
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setPreviewVisible(false)}
          activeOpacity={1}
        >
          <Image source={{ uri: previewImage }} style={{ width: "90%", height: "80%", resizeMode: "contain", borderRadius: 12 }} />
        </TouchableOpacity>
      </Modal>
    </View>
    </KeyboardAvoidingView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f3f3f3",
    paddingTop: 20,
    paddingInline: 10,
paddingBottom: 120  },
  title: { fontSize: 22, fontFamily: "Montt", marginBlock: 10 },
  chatTitle: { marginTop: 20, marginBottom: 10, fontFamily: "Montt", textAlign: "center" },
  dealBox: {  borderRadius: 8, backgroundColor: "#f3f3f3", marginVertical: 10, alignItems: "center" },
  dealAction: { color: "#fff", fontFamily: "Mont" },
  dealStatus: { color: "#555", fontFamily: "Mont" },
  contactBox: { padding: 10, backgroundColor: "#f0f0f0", borderRadius: 8, marginVertical: 10 },
  contactText: { fontSize: 16, marginBottom: 5, color: "#007AFF", fontFamily: "Montt" },
  messageRow: { flexDirection: "row", marginBottom: 8, alignItems: "flex-end" },
  myMessageRow: { justifyContent: "flex-end" },
  otherMessageRow: { justifyContent: "flex-start" },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  messageBubble: { padding: 10, borderRadius: 12, maxWidth: width * 0.7 },
  myMessage: { backgroundColor: "#DCF8C6", alignSelf: "flex-end" },
  otherMessage: { backgroundColor: "#eee" },
  author: { fontFamily: "Londrinak", marginBottom: 2 },
  messageMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  time: { fontSize: 10, color: "#555" },
  readStatus: { fontSize: 10, color: "#777", marginLeft: 5 },
  inputRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  sendButton: { padding: 10, backgroundColor: "#007AFF", borderRadius: 8, marginLeft: 8 },
  reviewButton: { backgroundColor:"#28a745", padding:12, borderRadius:8, alignItems:"center", marginTop:10 },
  modalOverlay: { flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"center", alignItems:"center" },
  modal: { backgroundColor:"white", padding:20, borderRadius:10, width:"85%", gap: 10 },
  modalTitle: { fontSize:18, fontFamily: "Montt", marginBottom:15, textAlign:"center" },
  stars: { flexDirection:"row", justifyContent:"center", marginBottom:20 },
  sendReview: { backgroundColor:"#007AFF", padding:12, borderRadius:8, alignItems:"center" },
});