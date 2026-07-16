import BackButton from "@/components/BackButton";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
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
  View
} from "react-native";
import logo from "../assets/briconnect33.png";
import fond from "../assets/convert_1.png";
import { useApi } from "../services/api";



type MessageType = {
  from: { _id: string; name: string; profileImage?: string };
  content: string;
  createdAt: string;
  readBy: string[];
  sending?: boolean;
  tempId?: string;
};

type ConversationType = {
  _id: string;
  messages: MessageType[];
  dealProposedByClient?: boolean;
  dealProposedByPro?: boolean;
  dealAcceptedByClient?: boolean;
  dealAcceptedByPro?: boolean;
};

type AssignedProType = {
  pro: string | { _id: string; name?: string; profileImage?: { url?: string } };
  status: "active" | "cancelled" | "completed";
  agreedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  reviewByClient?: boolean;
  reviewByPro?: boolean;
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
  assignedPros?: AssignedProType[]; // 🔹 ajouté
  reviewByClient?: boolean;
  reviewByPro?: boolean;
  createdAt?: string;

};

export default function RequestDetailPro() {
  const { apiFetch } = useApi();
  const params = useLocalSearchParams<{ id: string }>();
  const requestId = params.id;

  const [request, setRequest] = useState<RequestType>({
    _id: "",
    title: "",
    category: "",
    location: "",
    budget: 0,
    client: { _id: "", name: "" },
    status: "open",
    assignedPros: [],
  });

  const [currentUserId, setCurrentUserId] = useState("");
  const [message, setMessage] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const [contact, setContact] = useState<{ phone?: string; email?: string } | null>(null);

  const [reviewModal, setReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [proposingDeal, setProposingDeal] = useState(false);

  const reviewScale = useRef(new Animated.Value(1)).current;

  // Images preview
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const formatRelativeDate = (dateString?: string) => {
  if (!dateString) return "";

  const now = new Date();
  const date = new Date(dateString);

  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "À l’instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;

  return date.toLocaleDateString("fr-FR");
};

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
      } catch { }
    };
    markAsRead();
  }, [request?.conversation?._id]);

  const handleProposeDeal = async () => {
    if (!request?._id || proposingDeal) return;

    try {
      setProposingDeal(true);

      await apiFetch(`/requests/${request._id}/propose-deal`, {
        method: "POST",
      });

      const updatedRequest = await apiFetch(`/requests/${request._id}`);
      setRequest(updatedRequest);

      Alert.alert("Accord proposé", "En attente de validation du client");
    } catch (err) {
      console.error("Erreur propose deal:", err);
      Alert.alert("Erreur", "Impossible de proposer l'accord");
    } finally {
      setProposingDeal(false);
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

  const text = message;

  // vide immédiatement l'input
  setMessage("");

  // message temporaire
  const optimisticMessage: MessageType = {
    tempId: Date.now().toString(),
    from: {
      _id: currentUserId,
      name: "Moi",
    },
    content: text,
    createdAt: new Date().toISOString(),
    readBy: [currentUserId],
    sending: true,
  };

  // affichage immédiat
  setRequest(prev => {
    if (!prev) return prev;

    return {
      ...prev,
      conversation: {
        ...(prev.conversation ?? {
          _id: "",
          messages: [],
        }),
        messages: [
          ...(prev.conversation?.messages ?? []),
          optimisticMessage,
        ],
      },
    };
  });

  requestAnimationFrame(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  });

  try {
    const res = await apiFetch(`/requests/${requestId}/message`, {
      method: "POST",
      body: JSON.stringify({
        content: text,
      }),
    });

    // remplace par les vrais messages du serveur
    setRequest(prev =>
      prev
        ? {
            ...prev,
            conversation: res,
          }
        : prev
    );

    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });

  } catch (e: any) {

    // supprimer le faux message si erreur

    setRequest(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        conversation: {
          ...prev.conversation!,
          messages:
            prev.conversation?.messages.filter(
              m => m.tempId !== optimisticMessage.tempId
            ) ?? [],
        },
      };
    });

    Alert.alert("Erreur", e.message);
  }
};



  const submitReview = async () => {
    if (!request) return;
    try {
      await apiFetch(`/users/${request.client._id}/review`, {
        method: "POST",
        body: JSON.stringify({ score: rating, comment, requestId: request._id }),
      });

      await apiFetch(`/requests/${request._id}/review-complete`, {
        method: "POST",
        body: JSON.stringify({ proId: currentUserId }),
      });

      // 🔹 Rafraîchir request et recalculer assignment
      const updatedRequest = await apiFetch(`/requests/${request._id}`);
      setRequest(updatedRequest);

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
          toValue: 1.08,
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


  const getProId = (pro: string | { _id: string } | undefined) => {
    if (!pro) return "";
    return typeof pro === "string" ? pro : pro._id;
  };

  // récupérer l'assignement correspondant au pro courant
  const { proHasReviewed, clientHasReviewed, missionCompleted, canReview } = useMemo(() => {
    if (!request || !request.assignedPros || !currentUserId) {
      return {
        proHasReviewed: false,
        clientHasReviewed: false,
        missionCompleted: false,
        canReview: false,
      };
    }

    const assign =
      request.assignedPros.find(
        ap => getProId(ap.pro) === currentUserId
      ) ?? null;

    const proReviewed = assign?.reviewByPro ?? false;
    const clientReviewed = assign?.reviewByClient ?? false;

    const accepted =
      !!request.conversation &&
      (
        (request.conversation.dealProposedByPro && request.conversation.dealAcceptedByClient) ||
        (request.conversation.dealProposedByClient && request.conversation.dealAcceptedByPro)
      );

    return {
      proHasReviewed: proReviewed,
      clientHasReviewed: clientReviewed,
      missionCompleted: proReviewed && clientReviewed,
      canReview: accepted && !!assign && !proReviewed,
    };
  }, [request, currentUserId]);

  if (!request) return <Text>Chargement...</Text>;

  const messages = request.conversation?.messages || [];

  const clientProposed =
    request?.conversation?.dealProposedByClient && !request?.conversation?.dealAcceptedByClient;
  const proProposed =
    request?.conversation?.dealProposedByPro && !request?.conversation?.dealAcceptedByPro;



  return (

    <ImageBackground source={fond} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      // ajuste selon ton header
      >
        <Animated.View style={{ opacity: headerOpacity, flexDirection: "row", alignItems: "center", position: "relative", top: 30, paddingBottom: 15 }}>
          <Image source={logo} style={{ height: 60, width: 60 }} />
          <Text style={{ fontFamily: "Montt", fontSize: 16 }}>{request.title.slice(0,1).toUpperCase() + request.title.slice(1, request.title.length)}</Text></Animated.View>
        <BackButton />
        <Animated.ScrollView
          contentContainerStyle={styles.container}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={6}
          keyboardShouldPersistTaps="handled"
    automaticallyAdjustKeyboardInsets={true}

        >
          <Animated.View
            style={{
              marginBlock: 10,
              width: "100%",
              opacity: fadeOut,
              transform: [{ translateY }, { scale }],
              borderRadius:26,
    overflow:"hidden"

            }}
          >
            <LinearGradient colors={["#30a590", "#1a5b4f"]} locations={[0, 0.6]} style={{ padding: 20 }}>
              <View style={styles.heroTop}>
              <View style={{flex: 1}}>
                <Text style={styles.heroTitle}>{request.title.slice(0,1).toUpperCase() + request.title.slice(1, request.title.length)}</Text>
                <Text style={styles.heroSubtitle}>
                    {formatRelativeDate(request.createdAt)}
                </Text>
                </View>
                <Image
                source={{uri: request?.client?.profileImage?.url}}
                style={styles.heroAvatar}
            />
                </View>
                <View style={styles.heroBadges}>
                <View style={styles.heroBadge}>
                                <Text style={styles.heroBadgeText}>
                                    🔧 {request.category}
                                </Text>
                            </View>
                
                            <View style={styles.heroBadge}>
                                <Text style={styles.heroBadgeText}>
                                    📍 {request.location}
                                </Text>
                            </View>
                
                            <View style={styles.heroBadge}>
                                <Text style={styles.heroBadgeText}>
                                    💰 {request.budget <= 0 ? "À définir" : request.budget + " €"}
                                </Text>
                            </View>
                            </View>
              
            </LinearGradient>
          </Animated.View>
          {request.description &&
<View style={styles.sectionDescription}>
    <Text style={styles.sectionTitle}>Description</Text>

    <Text style={styles.sectionSubtitle}>
        Détails fournis par le client
    </Text>

    <Text style={styles.descriptionText}>
        {request.description}
    </Text>

    {request.images && request.images.length > 0 && (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
                paddingTop: 18,
                gap: 12,
            }}
        >
            {request.images.map((img, idx) => (
                <TouchableOpacity
                    key={idx}
                    onPress={() => openPreview(img.url)}
                >
                    <Image
                        source={{ uri: img.url }}
                        style={{
                            width: 140,
                            height: 140,
                            borderRadius: 16,
                        }}
                    />
                </TouchableOpacity>
            ))}
        </ScrollView>
    )}
</View>}
          {proProposed && !dealAccepted && <Text style={styles.dealStatus} accessibilityLiveRegion="polite">Vous avez proposé un accord — en attente du client ⏳</Text>}
          {dealAccepted && <Text style={[styles.dealStatus, { color: "green" }]} accessibilityLiveRegion="polite">🤝 Accord validé</Text>}

          {/* Coordonnées après accord */}
          {dealAccepted && contact && (
            <View style={styles.contactBox}>
              <Text style={{ textAlign: "center", fontFamily: "Montt", marginBottom: 10, color: "#1a5b4f" }}>Coordonnées</Text>
                              <View style={{ alignItems: "center", marginBottom: 10 }} accessible accessibilityLabel={`Client ${request?.client?.name}`}>

                                               <Image source={{ uri: request?.client?.profileImage?.url }} style={{ height: 60, width: 60, borderRadius: 30 }} />


                  <Text style={{ fontFamily: "Londrina" }}>{request?.client?.name}</Text>
                </View>
                <View>
                  {contact.phone && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`Appeler ${request?.client?.name}`}
                      accessibilityHint={`Lancer un appel au ${contact.phone}`}
                      style={{backgroundColor: "#c9f3d2", paddingBlock: 6, paddingInline: 10}} >
                      <Text style={styles.contactText}>📞 {contact.phone}</Text>
                    </TouchableOpacity>
                  )}
                  {contact.email && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`mailto:${contact.email}`)}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`Envoyer un email à ${request?.client?.name}`}
                      accessibilityHint={`Envoyer un email à ${contact.email}`}
                      style={{backgroundColor: "#eeeeee", paddingBlock: 6, paddingInline: 12, borderRadius: 20}} >
                      <Text style={styles.contactText}>✉️ {contact.email}</Text>
                    </TouchableOpacity>
                  )}
                </View>
            </View>
          )}

          {/* Actions deal */}
          <View style={styles.dealBox}>
            {!clientProposed && !proProposed && !dealAccepted && (
              <TouchableOpacity
                onPress={handleProposeDeal}
                disabled={proposingDeal}
                style={{
                  backgroundColor: proposingDeal ? "#8fb9ff" : "#007AFF",
                  width: 180,
                  padding: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 20
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Proposer un accord"
                accessibilityHint="Envoyer une proposition d'accord au client"
                accessibilityState={{ disabled: proposingDeal, busy: proposingDeal }}
              >
                <Text style={{ color: "#fff", fontFamily: "Mont" }}>
                  {proposingDeal ? "Envoi..." : "Proposer un accord"}
                </Text>
              </TouchableOpacity>
            )}

            {clientProposed && !dealAccepted && (
              <TouchableOpacity
                onPress={acceptDeal}
                style={{ backgroundColor: "#007AFF", padding: 14, width: 300, alignItems: "center", justifyContent: "center", borderRadius: 20 }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Accepter l'accord proposé par le client"
                accessibilityHint="Valider l'accord et accéder aux coordonnées" >
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


          </View>

          {dealAccepted && !missionCompleted && proHasReviewed && (
            <Text style={{ textAlign: "center", margin: 10, color: "#555", fontFamily: "Kanitt" }} accessibilityLiveRegion="polite">
              ✅ Avis envoyé! En attente de la note du client ⏳
            </Text>
          )}

          {dealAccepted && canReview && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => setReviewModal(true)}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Donner un avis"
              accessibilityHint="Ouvrir la fenêtre pour noter le client"
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

          {dealAccepted && missionCompleted && (
            <Text style={{ textAlign: "center", margin: 10, color: "green", fontFamily: "Kanitt" }} accessibilityLiveRegion="polite">
              🎉 Mission terminée !
            </Text>
          )}

          {/* Modal review */}
          <Modal visible={reviewModal} transparent animationType="slide" accessible>
            <View style={styles.modalOverlay}>
              <View
                style={styles.modal}
                accessible
                accessibilityViewIsModal={true}
                accessibilityLabel="Évaluation de la mission" >
                <Text style={styles.modalTitle} accessibilityRole="header">Comment s'est deroulée la mission ?</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setRating(s)}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`${s} étoile${s > 1 ? "s" : ""}`}
                      accessibilityState={{ selected: rating === s }} >
                      <Text style={{ fontSize: 30 }}>{s <= rating ? "⭐" : "☆"}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  placeholder="Commentaire (optionnel)"
                  value={comment}
                  onChangeText={setComment}
                  style={styles.input}
                  accessible
                  accessibilityLabel="Ajouter un commentaire"
                  accessibilityHint="Écrire un commentaire sur la mission"
                />
                <TouchableOpacity
                  style={styles.sendReview}
                  onPress={submitReview}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Envoyer l'avis"
                  accessibilityHint="Soumettre la note et le commentaire" >
                  <Text style={{ color: "#fff", fontFamily: "Mont" }}>Envoyer l'avis</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setReviewModal(false)}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Fermer"
                  accessibilityHint="Fermer la fenêtre d'évaluation" >
                  <Text style={{ textAlign: "center", marginTop: 10, fontFamily: "Mont" }}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Messages */}
          <Text style={styles.chatTitle} accessibilityRole="header">Conversation avec {request.client.name}</Text>
          <LinearGradient colors={["#cecece", "#8a8a8a"]} style={{ padding: messages.length <= 0 ? 0 : 5, borderRadius: 20 }}>
            {messages.map((msg, i) => {
              const isMe = msg.from._id === currentUserId;
              let status = "";
              if (isMe) {
                if (msg.readBy.length === 1) status = "✓ envoyé";
                if (msg.readBy.length >= 2) status = "✓✓ lu";
              }
              const msgTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <View
                  key={i}
                  style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}
                  accessible
                  accessibilityLabel={`${isMe ? "Vous" : msg.from.name}, ${msg.content}, à ${msgTime}${isMe ? `, ${status}` : ""}`} >
                  {!isMe && request.client?.profileImage && (
                    <Image source={{ uri: request.client?.profileImage?.url }} style={styles.avatar} />
                  )}
                  <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
                    {!isMe && <Text style={styles.author}>{msg.from.name}</Text>}
                    <Text style={{ fontFamily: "Mont", letterSpacing: -0.6 }}>{msg.content}</Text>
                    <View style={styles.messageMeta}>
    <Text style={styles.time}>{msgTime}</Text>

    {msg.sending ? (
        <Text
            style={{
                marginLeft: 6,
                color: "#999",
                fontSize: 10,
                fontFamily: "Londrina",
            }}
        >
            ⏳ Envoi...
        </Text>
    ) : (
        isMe && (
            <Text
                style={[
                    styles.readStatus,
                    msg.readBy.length >= 2 && { color: "#0b87da" },
                ]}
            >
                {status}
            </Text>
        )
    )}
</View>
                  </View>
                </View>
              );
            })}
          </LinearGradient>

          <View style={styles.inputContainer}>
  <TextInput
    value={message}
    onChangeText={setMessage}
    placeholder="Bonjour..."
    placeholderTextColor="#9A9A9A"
    style={styles.inputMsg}
    multiline
    maxLength={1000}
  />

  <TouchableOpacity
  onPress={sendMessage}
  disabled={!message.trim()}
  style={[
    styles.sendButton,
    !message.trim() && { backgroundColor: "#B8C2C0" },
  ]}
>
  <Text style={styles.sendIcon}>➜</Text>
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
      </KeyboardAvoidingView>

    </ImageBackground>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    paddingInline: 10,
    paddingBottom: 140, alignItems: "center"
  },
  title: { fontSize: 22, fontFamily: "Londrinak", marginBottom: 8, color: "#fff", textShadowColor: "#000", textShadowRadius: 2, textShadowOffset: {width: 2, height: 2}, padding: 2, letterSpacing: 0.5 },
  chatTitle: { marginTop: 20, marginBottom: 10, fontFamily: "Montt", textAlign: "center", fontSize: 20, color: "#1a5b4f" },
  dealBox: { borderRadius: 8, marginVertical: 10, alignItems: "center" },
  dealAction: { color: "#fff", fontFamily: "Mont" },
  dealStatus: { color: "#555", fontFamily: "Kanito" },
  contactBox: { padding: 16, backgroundColor: "#ffffff", borderRadius: 30, marginVertical: 10, width: "100%", shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 10,
  shadowOffset: {
    width: 0,
    height: 4,
  },

  elevation: 5,
alignItems: "center" },
  contactText: { fontSize: 16, marginBottom: 5, color: "#007AFF", fontFamily: "Kanito" },
  messageRow: { flexDirection: "row", marginBottom: 8, alignItems: "flex-end", width: "100%" },
  myMessageRow: { justifyContent: "flex-end" },
  otherMessageRow: { justifyContent: "flex-start" },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  messageBubble: { padding: 10, borderRadius: 12, maxWidth: width * 0.7 },
  myMessage: { backgroundColor: "#DCF8C6", alignSelf: "flex-end", borderRadius:24, borderBottomRightRadius:6, padding: 14 },
  otherMessage: { backgroundColor: "#eee", borderRadius:24, borderBottomLeftRadius:6, padding: 14 },
  author: { fontFamily: "Londrinak", marginBottom: 2 },
  messageMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  time: { fontSize: 10, color: "#555", fontFamily: "Londrina" },
  readStatus: { fontSize: 10, color: "#777", marginLeft: 5, fontFamily: "Londrina" },
inputContainer: {
  flexDirection: "row",
  alignItems: "flex-end",
  backgroundColor: "#fff",
  borderRadius: 30,
  padding: 6,
  marginTop: 18,

  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 10,
  shadowOffset: {
    width: 0,
    height: 4,
  },

  elevation: 5,
},

inputMsg: {
  flex: 1,
  fontFamily: "Mont",
  fontSize: 15,
  color: "#333",
  paddingHorizontal: 16,
  paddingVertical: 12,
  maxHeight: 120,
},

sendButton: {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: "#4b66e1",
  justifyContent: "center",
  alignItems: "center",
},

sendIcon: {
  color: "#fff",
  fontSize: 22,
  fontFamily: "Montt",
  marginLeft: 2, // centre visuellement le ➜
},  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  reviewButton: { backgroundColor: "#007AFF", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 10, width: "80%" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modal: { backgroundColor: "white", padding: 20, borderRadius: 10, width: "85%", gap: 10 },
  modalTitle: { fontSize: 18, fontFamily: "Montt", marginBottom: 15, textAlign: "center" },
  stars: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  sendReview: { backgroundColor: "#007AFF", padding: 12, borderRadius: 8, alignItems: "center" },
  badge:{
    backgroundColor:"#e5f3ee",
    borderRadius:18,
    paddingHorizontal:10,
    paddingVertical:8,
    shadowColor:"#000",
    shadowOpacity:0.92,
    shadowRadius:3,
    shadowOffset:{
        width:0,
        height:0
    },
    elevation:6,
    
},

badgeText:{
    color:"#1a5b4f",
    fontFamily:"Montt",
    fontSize: 13
},
badgesRow:{
    gap:10,
alignItems: "baseline"},
heroTop: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
},

heroLeft: {
  flex: 1,
  paddingRight: 12,
},

heroRight: {
  alignItems: "center",
  justifyContent: "center",
},

heroTitle: {
  fontSize: 24,
  color: "#fff",
  fontFamily: "Londrinak",
  textShadowColor: "rgb(0, 0, 0)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
  padding: 2
},

heroSubtitle: {
  color: "rgba(255,255,255,0.92)",
  fontFamily: "Mont",
  marginTop: 2,
  paddingInlineStart: 2
},

heroAvatar: {
  width: 60,
  height: 60,
  borderRadius: 30,
  borderWidth: 2,
  borderColor: "#fff",
  backgroundColor: "#ddd",
},
heroBadges: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 18,
},

heroBadge: {
  backgroundColor: "rgba(255, 255, 255, 0.28)",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
},

heroBadgeText: {
  color: "#fff",
  fontFamily: "Montt",
  fontSize: 13,
},
sectionCard:{
    backgroundColor:"#fff",
    borderRadius:22,
    padding:18,
    marginBottom:18,

    shadowColor:"#000",
    shadowOpacity:.08,
    shadowRadius:10,
    elevation:4,
    width: "100%"
},
sectionTitle: {
  fontSize: 22,
  fontFamily: "Montt",
  color: "#1a5b4f",
  marginBottom: 4,
  letterSpacing: 0.4,
},

sectionSubtitle: {
  fontSize: 14,
  fontFamily: "Mont",
  color: "#6d6d6d",
  marginBottom: 14,
  lineHeight: 20,
},
sectionDescription: {
  width: "100%",
  backgroundColor: "#fff",
  borderRadius: 22,
  padding: 20,
  marginTop: 18,
  marginBottom: 18,

  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 12,
  shadowOffset: {
    width: 0,
    height: 6,
  },

  elevation: 5,
},

descriptionText: {
  fontFamily: "Londrina",
  fontSize: 16,
  color: "#444",
  lineHeight: 26,
  textAlign: "justify",
},
});