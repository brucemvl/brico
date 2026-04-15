import BackButton from "@/components/BackButton";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import fond from "../assets/convert_1.png";
import RequestImages from "../components/RequestImages"; // ← notre nouveau composant
import { useApi } from "../services/api";



type UserType = {
  _id: string;
  name: string;
  profileImage?: { url: string };
};

type MessageType = {
  from: UserType;
  content: string;
  readBy: string[];
  createdAt: string;
};

type ConversationType = {
  _id: string;
  pro: UserType;
  messages: MessageType[];
};

type ImageType = {
  _id: string;
  url: string;
  public_id: string;
};

type RequestType = {
  _id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  budget: number;
  status: string;
  images?: ImageType[];
  client: UserType;
  conversations: ConversationType[];
  createdAt?: string;

};

export default function RequestDetailClient() {
  const { apiFetch, user } = useApi();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const userId = user?.userId;

  const [request, setRequest] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("fr-FR");
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

  // 🔹 Refetch à chaque focus
  useFocusEffect(
    useCallback(() => {
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
    }, [id])
  );


  if (loading) return <Text>Chargement...</Text>;
  if (!request) return <Text>Demande introuvable</Text>;

  return (
      <ImageBackground source={fond} style={{flex: 1}}>
              <Animated.Text style={{ fontFamily: "Montt", opacity: headerOpacity, marginTop: 50, marginLeft: 10, fontSize: 16 }}>{request.title}</Animated.Text>
    <BackButton />
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
            <LinearGradient 
            colors={[ "#30a590", "#1a5b4f" ]} 
            style={{padding: 20, borderRadius: 20, width: "100%", flexDirection: "row", justifyContent: "space-between"}}
            accessible
  accessibilityLabel={`Demande ${request.title}, catégorie ${request.category}, budget ${request.budget} euros, à ${request.location}`}
  >
                      <View style={{gap: 5}}>
                              <Text style={styles.title}>{request.title}</Text>
                    <Text style={{fontFamily: "Montt", color: "#fff"}}>Catégorie: {request.category}</Text>
                    <Text style={{fontFamily: "Montt", color: "#fff"}}>Lieu: {request.location}</Text>
                    <Text style={{fontFamily: "Montt", color: "#fff"}}>Budget: {request.budget}€</Text>
                    </View>
                    <View style={{flexDirection: "row-reverse", alignItems: "flex-end", gap: 5}}>
                      {request?.client?.profileImage?.url && (
                    <Image source={{uri: request?.client?.profileImage?.url}} style={{height: 30, width: 30, borderRadius: 15}} />
                      )}
                    <Text style={{fontSize: 11, color: "#fff", fontFamily: "Montt"}}>{formatDate(request?.createdAt)}</Text>
                    </View>
                    </LinearGradient>
                    </Animated.View>

      {/* 🔹 Composant images avec upload/suppression/preview */}
      <RequestImages request={request} setRequest={setRequest} />

      {/* 🔹 Conversations */}
      <Text 
      style={{ marginTop: 20, fontFamily: "Montt" }} accessible
  accessibilityRole="header"
  accessibilityLabel="Liste des conversations avec les professionnels" >
    Conversations avec les pros
    </Text>
      {request.conversations?.map((conv) => {
        const unread = userId
  ? conv.messages?.filter(
      (m) =>
        !m.readBy?.includes(userId) &&
        m.from._id !== userId
    ).length || 0
  : 0;

        const openConversation = async () => {
  await apiFetch(`/conversations/${conv._id}/mark-read`, { method: "POST" });

  // 🔥 force refresh
  setRequest(prev => {
    if (!prev) return prev;

    return {
      ...prev,
      conversations: prev.conversations.map(c =>
        c._id === conv._id
          ? {
              ...c,
              messages: c.messages.map(m => ({
                ...m,
                readBy: [...(m.readBy || [])]
              }))
            }
          : c
      )
    };
  });

  router.push({ pathname: "/conversation", params: { id: conv._id } });
};

        return (
          <TouchableOpacity 
          key={conv._id} 
          style={styles.conversationCard} 
          onPress={openConversation}
          accessible
  accessibilityRole="button"
  accessibilityLabel={`Conversation avec ${conv.pro.name}`}
  accessibilityHint="Ouvrir la discussion"
  >
            {conv.pro.profileImage?.url && <Image source={{ uri: conv.pro.profileImage.url }} style={styles.avatar} accessible={false} />}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Londrinak", fontSize: 17 }}>{conv.pro.name}</Text>
              {conv.messages?.length > 0 && <Text numberOfLines={1} style={{fontFamily: "Kanit"}} accessible
  accessibilityLabel={`Dernier message : ${conv.messages?.at(-1)?.content || "Aucun message"}`}>{conv.messages[conv.messages.length - 1].content}</Text>}
            </View>
            {unread > 0 && (
              <View style={styles.unreadBadge} accessible
  accessibilityLabel={`${unread} messages non lus`}>
                <Text style={styles.unreadText}>{unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </Animated.ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {paddingTop: 40,
    paddingInline: 10,
paddingBottom: 140,
 alignItems: "center"
 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  conversationCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 4, borderColor: "#1a5b4f", borderRadius: 12, marginTop: 10, backgroundColor: "#F3F3F3", width: "90%" },
  unreadBadge: { backgroundColor: "red", borderRadius: 10, width: 20, height: 20, justifyContent: "center", alignItems: "center", marginLeft: 8 },
  unreadText: { color: "white", fontSize: 12, fontWeight: "bold" },
});