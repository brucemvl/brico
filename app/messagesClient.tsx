import BackButton from "@/components/BackButton";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ImageBackground,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import fond from "../assets/convert_1.png";
import { useApi } from "../services/api";

type UserType = {
  _id: string;
  name?: string;
  profileImage?: { url?: string } | string;
} | null;

type ConversationType = {
  _id: string;
  type: "request" | "direct";
  client: UserType;
  pro: UserType;
  request?: {
    _id: string;
    title?: string;
    category?: string;
  } | string | null;
  messages: {
    _id?: string;
    from: UserType | string;
    content?: string;
    images?: { url: string }[];
    readBy?: (string | { _id: string })[];
    createdAt?: string;
  }[];
  lastInteractionAt?: string;
  pinnedBy?: (string | { _id: string })[];
  dealProposedByClient?: boolean;
  dealProposedByPro?: boolean;
  dealAcceptedByClient?: boolean;
  dealAcceptedByPro?: boolean;
};

export default function MessagesClient() {
  const router = useRouter();
  const { apiFetch } = useApi();

  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getId = (value: any): string => {
    if (!value) return "";
    return typeof value === "string"
      ? value
      : value._id?.toString() ?? "";
  };

  const fetchConversations = async () => {
    try {
      const [me, data] = await Promise.all([
        apiFetch("/users/me"),
        apiFetch("/conversations"),
      ]);

      setCurrentUserId(me._id);

      const list: ConversationType[] = Array.isArray(data) ? data : [];

      // On conserve uniquement les conversations du client connecté.
      const clientConversations = list.filter(
        (conversation) => getId(conversation.client) === me._id
      );

      clientConversations.sort((a, b) => {
  // 1. Priorité aux conversations avec des messages non lus
  const aUnread = a.messages?.some((message) => {
    const isMine = getId(message.from) === me._id;
    const alreadyRead = message.readBy?.some(
      (id) => getId(id) === me._id
    );

    return !isMine && !alreadyRead;
  }) ? 1 : 0;

  const bUnread = b.messages?.some((message) => {
    const isMine = getId(message.from) === me._id;
    const alreadyRead = message.readBy?.some(
      (id) => getId(id) === me._id
    );

    return !isMine && !alreadyRead;
  }) ? 1 : 0;

  if (aUnread !== bUnread) return bUnread - aUnread;

  // 2. Ensuite, les conversations épinglées
  const aPinned = a.pinnedBy?.some(
    (id) => getId(id) === me._id
  ) ? 1 : 0;

  const bPinned = b.pinnedBy?.some(
    (id) => getId(id) === me._id
  ) ? 1 : 0;

  if (aPinned !== bPinned) return bPinned - aPinned;

  // 3. Enfin, les plus récentes
  return (
    new Date(b.lastInteractionAt || 0).getTime() -
    new Date(a.lastInteractionAt || 0).getTime()
  );
});

      setConversations(clientConversations);
    } catch (error) {
      console.error("Erreur chargement conversations :", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const getUnreadCount = (conversation: ConversationType) => {
    return conversation.messages?.filter((message) => {
      const isMine = getId(message.from) === currentUserId;

      const alreadyRead = message.readBy?.some(
        (id) => getId(id) === currentUserId
      );

      return !isMine && !alreadyRead;
    }).length ?? 0;
  };

  const getLastMessage = (conversation: ConversationType) => {
    const last =
      conversation.messages?.[conversation.messages.length - 1];

    if (!last) return "Aucun message";
    if (last.content?.trim()) return last.content;
    if (last.images?.length) return "📷 Photo";

    return "Nouvelle conversation";
  };

  const formatDate = (date?: string) => {
    if (!date) return "";

    const value = new Date(date);
    const now = new Date();

    if (value.toDateString() === now.toDateString()) {
      return value.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return value.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const getRequest = (conversation: ConversationType) => {
    return conversation.request &&
      typeof conversation.request === "object"
      ? conversation.request
      : null;
  };

  const getProfileImage = (user: UserType) => {
    if (!user?.profileImage) return null;

    if (typeof user.profileImage === "string") {
      return user.profileImage;
    }

    return user.profileImage.url || null;
  };

  const getDealStatus = (conversation: ConversationType) => {
    const dealAccepted =
      (conversation.dealProposedByPro &&
        conversation.dealAcceptedByClient) ||
      (conversation.dealProposedByClient &&
        conversation.dealAcceptedByPro);

    if (dealAccepted) {
      return "✓ Accord accepté";
    }

    if (conversation.dealProposedByPro) {
      return "Accord à accepter";
    }

    if (conversation.dealProposedByClient) {
      return "En attente du professionnel";
    }

    return null;
  };

  const openConversation = (conversation: ConversationType) => {
    router.push({
      pathname: "/conversation",
      params: { id: conversation._id },
    });
  };

  if (loading) {
    return (
      <ImageBackground source={fond} style={styles.background}>
        <BackButton />
        <ActivityIndicator
          size="large"
          color="#1a5b4f"
          style={{ flex: 1 }}
        />
      </ImageBackground>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Image source={fond} style={styles.backgroundImage} />
      <BackButton />

      <View style={styles.header}>
        <Text style={styles.title}>Mes conversations</Text>
        <Text style={styles.subtitle}>
          Retrouvez tous vos échanges avec les professionnels
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchConversations();
            }}
            tintColor="#1a5b4f"
          />
        }
      >
        {conversations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>
              Aucune conversation pour le moment
            </Text>
            <Text style={styles.emptyText}>
              Vos échanges avec les professionnels apparaîtront ici.
            </Text>
          </View>
        ) : (
          conversations.map((conversation) => {
            const unread = getUnreadCount(conversation);
            const request = getRequest(conversation);
            const lastMessage =
              conversation.messages?.[conversation.messages.length - 1];
            const dealStatus = getDealStatus(conversation);

            return (
              <TouchableOpacity
                key={conversation._id}
                style={styles.conversation}
                onPress={() => openConversation(conversation)}
                activeOpacity={0.8}
              >
                <Image
                  source={
                    getProfileImage(conversation.pro)
                      ? { uri: getProfileImage(conversation.pro)! }
                      : require("../assets/briconnect33.png")
                  }
                  style={styles.avatar}
                />

                <View style={styles.content}>
                  <View style={styles.topRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {conversation.pro?.name || "Professionnel"}
                    </Text>

                    <Text style={styles.date}>
                      {formatDate(
                        lastMessage?.createdAt ||
                        conversation.lastInteractionAt
                      )}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.context,
                      request
                        ? styles.requestContext
                        : styles.directContext,
                    ]}
                    numberOfLines={1}
                  >
                    {request?.title || "Conversation directe"}
                  </Text>

                  <Text
                    style={[
                      styles.lastMessage,
                      unread > 0 && styles.unreadMessage,
                    ]}
                    numberOfLines={1}
                  >
                    {getLastMessage(conversation)}
                  </Text>

                  {dealStatus && (
                    <Text
                      style={[
                        styles.dealStatus,
                        dealStatus === "Accord à accepter" &&
                          styles.dealToAccept,
                        dealStatus === "✓ Accord accepté" &&
                          styles.dealAccepted,
                      ]}
                    >
                      {dealStatus}
                    </Text>
                  )}
                </View>

                {unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unread > 99 ? "99+" : unread}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundImage: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: "100%",
  height: "100%",
  resizeMode: "cover",
},
  header: {
    paddingHorizontal: 22,
    paddingTop: 75,
    paddingBottom: 20,
    marginTop: 60,
  },
  title: {
    fontFamily: "Montt",
    fontSize: 25,
    color: "#1a5b4f",
  },
  subtitle: {
    fontFamily: "Mont",
    color: "#666",
    marginTop: 5,
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  conversation: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 13,
    marginBottom: 11,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 53,
    height: 53,
    borderRadius: 27,
    backgroundColor: "#eee",
  },
  content: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontFamily: "Montt",
    fontSize: 15,
    color: "#1a5b4f",
    flex: 1,
  },
  date: {
    fontFamily: "Mont",
    fontSize: 10,
    color: "#888",
    marginLeft: 5,
  },
  context: {
    fontFamily: "Montt",
    fontSize: 11,
    marginTop: 4,
  },
  lastMessage: {
    fontFamily: "Mont",
    fontSize: 12,
    color: "#777",
    marginTop: 5,
  },
  unreadMessage: {
    color: "#222",
    fontFamily: "Montt",
  },
  dealStatus: {
    fontFamily: "Montt",
    fontSize: 10,
    color: "#b7791f",
    marginTop: 5,
  },
  dealToAccept: {
    color: "#d97706",
  },
  dealAccepted: {
    color: "#1a5b4f",
  },
  badge: {
    backgroundColor: "#e53935",
    minWidth: 23,
    height: 23,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontFamily: "Montt",
    fontSize: 11,
  },
  empty: {
    alignItems: "center",
    marginTop: 90,
    paddingHorizontal: 25,
  },
  emptyIcon: {
    fontSize: 45,
    marginBottom: 15,
  },
  emptyTitle: {
    fontFamily: "Montt",
    fontSize: 16,
    color: "#1a5b4f",
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Mont",
    color: "#777",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  requestContext: {
    color: "#3db64b",
  },
  directContext: {
    color: "#4b66e1",
  },
});