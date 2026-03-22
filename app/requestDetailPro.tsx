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
  client: { _id: string; name: string; profileImage?: { url?: string }; phone?: string; email?: string };
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

  const reviewScale = useRef(new Animated.Value(1)).current;

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
            conversation: res,
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
    // 1️⃣ Envoie la note
    await apiFetch(`/users/${request.client._id}/review`, {
      method: "POST",
      body: JSON.stringify({
        score: rating,
        comment,
        requestId: request._id,
      }),
    });

    // 2️⃣ Informe le backend que le review est terminé
    await apiFetch(`/requests/${request._id}/review-complete`, {
      method: "POST",
      body: JSON.stringify({
        proId: currentUserId,
      }),
    });

    // 3️⃣ Recharge la demande pour avoir le status mis à jour
    fetchRequest();

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

    useEffect(() => {
  const animation = Animated.loop(
    Animated.sequence([
      Animated.timing(reviewScale, {
        toValue: 1.12,
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

  if (!request) return <Text>Chargement...</Text>;

  const messages = request.conversation?.messages || [];

  const canReview = dealAccepted && !request.reviewByPro;

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
        <LinearGradient colors={[ "#30a590", "#1a5b4f" ]} style={{padding: 20, borderRadius: 20, width: "100%", flexDirection: "row", justifyContent: "space-between"}}>
          <View style={{gap: 5}}>
                  <Text style={styles.title}>{request.title}</Text>
        <Text style={{fontFamily: "Montt", color: "#fff"}}>Catégorie: {request.category}</Text>
        <Text style={{fontFamily: "Montt", color: "#fff"}}>Lieu: {request.location}</Text>
        <Text style={{fontFamily: "Montt", color: "#fff"}}>Budget: {request.budget}€</Text>
        </View>
        <View style={{flexDirection: "row-reverse", alignItems: "flex-end", gap: 5}}>
        <Image source={{uri: request?.client?.profileImage?.url}} style={{height: 30, width: 30, borderRadius: 15}}/>
        <Text style={{fontSize: 15, color: "#fff", fontFamily: "Londrina"}}>{request?.client?.name}</Text>
        </View>
        </LinearGradient>
        </Animated.View>
        {request.description &&
        <View style={{backgroundColor: "#237163" , width: "100%", borderRadius: 20, padding: 10}}>
        <View style={{alignItems: "center", gap: 10}}>
          <Text style={{fontFamily: "Montt", fontSize: 20, marginTop: 10, textAlign: "center"}}>Description</Text>
          <View style={{width: "100%", padding: 12}}>
        <Text  style={{fontFamily: "Montt", fontSize: 14, color: "#ffffff"}}>{request.description}</Text>
        </View>
        </View>

        {/* 🔹 Images du client */}
        {request.images && request.images.length > 0 && (
          <ScrollView horizontal style={{ marginVertical: 10,  padding: 10, borderRadius: 20, width: "100%" }} contentContainerStyle={{justifyContent: "center", alignItems: "center"}}>
            {request.images.map((img, idx) => (
              <TouchableOpacity key={idx} onPress={() => openPreview(img.url)} style={{ marginRight: 10 }}>
                <Image source={{ uri: img.url }} style={{ width: 130, height: 130, borderRadius: 8 }} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        </View>}

        {/* Coordonnées après accord */}
        {dealAccepted && contact && (
          <View style={styles.contactBox}>
            <Text style={{textAlign: "center", fontFamily: "Montt", marginBottom: 10}}>Coordonnées</Text>
            <View style={{flexDirection: "row", alignItems: "center", gap: 20}}>
              <View style={{alignItems: "center"}}>
                <Image source={{uri: request?.client?.profileImage?.url}} style={{height: 30, width: 30, borderRadius: 15}} />
                <Text style={{fontFamily: "Londrina"}}>{request?.client?.name}</Text>
              </View>
            <View>
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
            </View>
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
            <TouchableOpacity onPress={acceptDeal} style={{backgroundColor: "#007AFF", padding: 14, width: 300, alignItems: "center", justifyContent: "center", borderRadius: 20 }}>
<Animated.Text
    style={{
      color: "#fefefe",
      fontFamily: "Mont",
      fontSize: 13,
      transform: [{ scale: reviewScale }],
    }}
  >
    Accepter l'accord proposé par le client
  </Animated.Text>
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
<Animated.Text
    style={{
      color: "#fefefe",
      fontFamily: "Mont",
      transform: [{ scale: reviewScale }],
    }}
  >
    Donner un avis ⭐
  </Animated.Text>
            </TouchableOpacity>
        )}

        {/* Modal review */}
        <Modal visible={reviewModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Comment s'est deroulée la mission ?</Text>
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
        <LinearGradient colors={["#cecece", "#8a8a8a"]} style={{padding: 5, borderRadius: 20}}>
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
                  {isMe && <Text style={[styles.readStatus, msg.readBy.length >= 2 && {color: "#0b87da"} ]}>{status}</Text>}
                </View>
              </View>
            </View>
          );
        })}
        </LinearGradient>

        <View style={styles.inputRow}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Votre message..."
            style={styles.inputMsg}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Text style={{ color: "#fff", fontFamily: "Mont", fontSize: 12 }}>Envoyer</Text>
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
paddingBottom: 120, alignItems: "center"  },
  title: { fontSize: 22, fontFamily: "Montt", marginBlock: 10 },
  chatTitle: { marginTop: 20, marginBottom: 10, fontFamily: "Montt", textAlign: "center" },
  dealBox: {  borderRadius: 8, backgroundColor: "#f3f3f3", marginVertical: 10, alignItems: "center" },
  dealAction: { color: "#fff", fontFamily: "Mont" },
  dealStatus: { color: "#555", fontFamily: "Mont" },
  contactBox: { padding: 10, backgroundColor: "#e5e5e5", borderRadius: 8, marginVertical: 10, width: "100%" },
  contactText: { fontSize: 16, marginBottom: 5, color: "#007AFF", fontFamily: "Montt" },
  messageRow: { flexDirection: "row", marginBottom: 8, alignItems: "flex-end", width: "100%" },
  myMessageRow: { justifyContent: "flex-end" },
  otherMessageRow: { justifyContent: "flex-start" },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  messageBubble: { padding: 10, borderRadius: 12, maxWidth: width * 0.7 },
  myMessage: { backgroundColor: "#DCF8C6", alignSelf: "flex-end" },
  otherMessage: { backgroundColor: "#eee" },
  author: { fontFamily: "Londrinak", marginBottom: 2 },
  messageMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  time: { fontSize: 10, color: "#555", fontFamily: "Londrina" },
  readStatus: { fontSize: 10, color: "#777", marginLeft: 5, fontFamily: "Londrina" },
  inputRow: { flexDirection: "row", alignItems: "center", marginTop: 10, width: "100%" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  inputMsg: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, width: "78%", fontFamily: "Mont" },
  sendButton: { padding: 10, backgroundColor: "#007AFF", borderRadius: 8, marginLeft: "2%", width: "20%", alignItems: "center", justifyContent: "center" },
  reviewButton: { backgroundColor:"#28a745", padding:12, borderRadius:8, alignItems:"center", marginTop:10, width: "80%" },
  modalOverlay: { flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"center", alignItems:"center" },
  modal: { backgroundColor:"white", padding:20, borderRadius:10, width:"85%", gap: 10 },
  modalTitle: { fontSize:18, fontFamily: "Montt", marginBottom:15, textAlign:"center" },
  stars: { flexDirection:"row", justifyContent:"center", marginBottom:20 },
  sendReview: { backgroundColor:"#007AFF", padding:12, borderRadius:8, alignItems:"center" },
});