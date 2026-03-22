import { useFocusEffect } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import modifier from "../assets/modifier.png";
import { useApi } from "../services/api";



type RequestType = {
  _id: string;
  title: string;
  category: string;
  location: string;
  budget: number;
  status: "open" | "in_progress" | "completed";
  hasUnread?: boolean;
assignedPros?: {
  pro: string;
  status: "active" | "cancelled" | "completed";
  agreedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  reviewByClient?: boolean;
  reviewByPro?: boolean;
}[];

myAssignmentStatus?: "active" | "cancelled" | "completed" | null;

createdAt?: string;
};

const categories = ["Plomberie", "Peinture", "Agencement", "Electricité", "Carrelage", "Divers"];

const defaultAvatar = "https://res.cloudinary.com/dwjssp2pd/image/upload/v1773074497/default_pro.jpg";




export default function HomePro() {
  type ProfileType = {
    _id?: string;
  name?: string;
  location?: string;
  profileImage?: { url?: string };
  averageRating?: number;
};

const [requestView, setRequestView] = useState<"requests" | "deals" | "completed">("requests");
const [pickerOpen, setPickerOpen] = useState(false);

  const router = useRouter();
  const { apiFetch, logout } = useApi();
  const [profile, setProfile] = useState<ProfileType | null>(null);

  const [requests, setRequests] = useState<RequestType[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<"skills" | "all" | string>("skills");
  const [loading, setLoading] = useState(true);

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

  const [fontsLoaded] = useFonts({ 
    "Londrina": require("../assets/fonts/Londrina/LondrinaSolid-Regular.ttf"), 
    "Londrinak": require("../assets/fonts/Londrina/LondrinaSolid-Black.ttf"), 
    "Mont": require("../assets/fonts/Montserrat/Montserrat-Regular.ttf"), 
    "Montt": require("../assets/fonts/Montserrat/Montserrat-Bold.ttf"), 
  });

  const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("fr-FR");
};

const formatRating = (value?: number) => {
  if (value == null) return "0";
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

  // 🔹 Charger le profil
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await apiFetch("/users/me");
        setProfile(data);
      } catch (err) {
        console.log("Erreur profil", err);
      }
    };
    loadProfile();
  }, []);

  // 🔹 Fetch demandes + compétences
  const fetchRequests = async () => {
  setLoading(true);

  try {
    const data = await apiFetch("/requests/pro");

    if (!data) {
      console.log("API response vide");
      return;
    }

    console.log("REQUESTS APIIII:", data.requests);
    console.log("REQUESTS API:", data);

    setRequests(data.requests || []);
    setSkills(data.skills || []);

  } catch (err) {
    console.error("Erreur fetch pro:", err);
  } finally {
    setLoading(false);
  }
};

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  const requestViewLabels: Record<"requests" | "deals" | "completed", string> = {
  requests: "Demandes",
  deals: "Avec accord",
  completed: "Terminées",
};

const changeRequestView = (view: "requests" | "deals" | "completed") => {
  setRequestView(view);
  setPickerOpen(false);
  setActiveFilter(view === "requests" ? "skills" : "all");
};

  // 🔹 Logique de filtrage
  const filteredRequests = (() => {
  let baseFiltered: RequestType[] = [];

  switch (requestView) {
    case "requests":
      baseFiltered = requests.filter(
        r => r.status === "open" || r.status === "in_progress"
      );
      break;

    case "deals":
      baseFiltered = requests.filter(
        r => r.assignedPros?.some(
          ap => ap.pro === profile?._id && ap.status === "active"
        )
      );
      break;

    case "completed":
      baseFiltered = requests.filter(
        r => r.assignedPros?.some(
          ap => ap.pro === profile?._id && ap.status === "completed"
        )
      );
      break;

    default:
      baseFiltered = requests;
  }

  switch (activeFilter) {
    case "skills":
      return requestView === "requests"
        ? baseFiltered.filter(r => skills.includes(r.category))
        : baseFiltered;
    case "all":
      return baseFiltered;
    default:
      return baseFiltered.filter(r => r.category === activeFilter);
  }
})();

  // 🔹 HasUnread par catégorie pour pastille rouge
  const hasUnreadByCategory = React.useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat] = requests.some(r => r.category === cat && r.hasUnread);
      return acc;
    }, {} as Record<string, boolean>);
  }, [requests]);

  // 🔹 Marquer conversation comme lue
  const openRequest = async (request: RequestType) => {
    router.push({ pathname: "/requestDetailPro", params: { id: request._id } });

    if (!request.hasUnread) return;

    try {
      const conversations = await apiFetch(`/conversations?requestId=${request._id}`);
      const conversationId = conversations[0]?._id;
      if (!conversationId) return;

      await apiFetch(`/conversations/${conversationId}/mark-read`, {
        method: "POST",
      });

      setRequests(prev =>
        prev.map(r => (r._id === request._id ? { ...r, hasUnread: false } : r))
      );
    } catch (err) {
      console.error("Erreur mark read:", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Chargement des demandes...</Text>
      </View>
    );
  }

    if (!fontsLoaded) return null;


  return (
    <View>
  <Animated.Text style={{ fontFamily: "Montt", opacity: headerOpacity, marginTop: 50, marginLeft: 10 }}>Accueil</Animated.Text>
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
    marginBlock: 20,
    width: "100%",
    paddingInline: 20,
    opacity: fadeOut,
    transform: [{ translateY }, { scale }],
  }}
>
    <View style={{width: "100%", alignItems: "center", position: "absolute", zIndex: 99, bottom: profile?.location ? 120 : 100}}>
<Image
  source={{ uri: profile?.profileImage?.url || defaultAvatar }}
  style={styles.avatar}
/>
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/profilePro" })}
        style={styles.profileButton}
      >
        <Image source={modifier} style={{width: 20, height: 20}}/>
      </TouchableOpacity>
      </View>
      <LinearGradient colors={["#1a5b4f", "#30a590" ]} style={{width: "100%", alignItems: "center", paddingInline: 20, paddingTop: 54, paddingBottom: 24, borderRadius: 20, gap: 4}}>
      <Text style={{fontFamily: "Londrinak", fontSize: 16 }}>{profile?.name}</Text>
      {profile?.location && 
      <Text style={{fontFamily: "Londrinak", fontSize: 16 }}>{profile?.location}</Text>
      }
      {/* ⭐ Rating pro */}
{typeof profile?.averageRating === "number" && (
  <View style={{ flexDirection: "row"}}>
    {[1,2,3,4,5].map(i => (
      <Text key={i} style={{ fontSize: 16 }}>
        {i <= Math.round(profile?.averageRating ?? 0) ? "⭐" : "☆"}
      </Text>
    ))}
  </View>
)}
    <Text style={{fontFamily: "Mont"}}>({formatRating(profile?.averageRating)})</Text>
    </LinearGradient>

</Animated.View>


<View style={styles.pickerWrapper}>
  <TouchableOpacity
    style={styles.pickerButton}
    onPress={() => setPickerOpen(prev => !prev)}
    activeOpacity={0.8}
  >
    <Text style={styles.pickerButtonText}>
      {requestViewLabels[requestView]}
    </Text>
    <Text style={styles.pickerArrow}>{pickerOpen ? "▲" : "▼"}</Text>
  </TouchableOpacity>

  {pickerOpen && (
    <View style={styles.pickerDropdown}>
      {(["requests", "deals", "completed"] as const).map(option => (
        <TouchableOpacity
          key={option}
          style={[
            styles.pickerOption,
            requestView === option && styles.pickerOptionActive
          ]}
          onPress={() => changeRequestView(option)}
        >
          <Text
            style={[
              styles.pickerOptionText,
              requestView === option && styles.pickerOptionTextActive
            ]}
          >
            {requestViewLabels[option]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )}
</View>

<Text style={styles.title}>
  {requestView === "requests"
    ? "Demandes disponibles"
    : requestView === "deals"
    ? "Demandes avec accord"
    : "Demandes terminées"}
</Text>

      {/* 🔹 Boutons filtres */}
      {requestView === "requests" &&
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === "skills" && styles.activeFilter]}
          onPress={() => setActiveFilter("skills")}
        >
          <Text style={styles.filterText}>Mes compétences</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, activeFilter === "all" && styles.activeFilter]}
          onPress={() => setActiveFilter("all")}
        >
          <Text style={styles.filterText}>Toutes</Text>
        </TouchableOpacity>

        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterButton, activeFilter === cat && styles.activeFilter]}
            onPress={() => setActiveFilter(cat)}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={styles.filterText}>{cat}</Text>
              {hasUnreadByCategory[cat] && <View style={styles.categoryBadge} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
}

      {/* 🔹 Liste des demandes */}
      <View style={styles.requestsContainer}>
        {filteredRequests.length === 0 ? (
          <Text style={{fontFamily: "Londrina", fontSize: 18, marginBlock: 20}}>Aucune demande disponible</Text>
        ) : (
          filteredRequests.map(item => {
            const isMatchingSkill = skills.includes(item.category);
            const isAssignedToMe = item.assignedPros?.some(
  ap => ap.pro === profile?._id && ap.status === "active"
);

            return (
              <TouchableOpacity key={item._id} onPress={() => openRequest(item)} style={{ width: "95%" }}>
                <View style={styles.card}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#1a5b4f", paddingBlock: 6, paddingInline: 6 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={{ fontFamily: "Montt", fontSize: 11, color: "#ffffff" }}>
  {formatDate(item.createdAt)}
</Text>
                  </View>
<View style={styles.cardContainer}>
<View style={{gap: 4}}>
                  <Text style={{fontFamily: "Londrina", fontSize: 16, color: "#783516"}}>Catégorie : {item.category}</Text>
                  <Text style={{fontFamily: "Londrina", fontSize: 16, color: "#783516"}}>Lieu : {item.location}</Text>
                  <Text style={{fontFamily: "Londrina", fontSize: 16, color: "#783516"}}>Budget : {item.budget}€</Text>
                 </View>
                 {item.hasUnread && <View style={styles.messageBadge} />}
                  </View>

                  {isAssignedToMe && (
                    <View style={styles.acceptedBadge}>
                      <Text style={{ fontSize: 12, fontFamily: "Mont" }}>🤝 Accord conclu</Text>
                    </View>
                  )}

                  {isMatchingSkill && (
                    <View style={styles.skillBadge}>
                      <Text style={styles.badgeText}>Correspond à vos compétences</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <TouchableOpacity onPress={async () => { await logout(); router.replace("/"); }} style={{ marginTop: 20, padding: 8 }}>
        <Text style={{fontFamily: "Mont", color: "red"}}>Deconnexion</Text>
      </TouchableOpacity>
    </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 60, alignItems: "center", paddingBottom: 90 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontFamily: "Montt", marginBottom: 15 },
  avatar: { height: 90, width: 90, resizeMode: "contain", borderRadius: 45, borderWidth: 2, borderColor: "#f3f3f3" },
  profileButton: { padding: 5, borderRadius: 50, backgroundColor: "#999999", position: "absolute", bottom: 5, right: 8, borderColor: "#f5f5f5", borderWidth: 1 },
header: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 80,
  zIndex: 10,
  justifyContent: "flex-end",
  padding: 15,
},
  filtersContainer: { marginBottom: 15, flexWrap: "wrap", flexDirection: "row", gap: 6, justifyContent: "center" },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  filterText: {fontFamily: "Mont"},
  activeFilter: { backgroundColor: "#a4a4a4" },

  requestsContainer: { width: "100%", paddingHorizontal: 20, alignItems: "center" },
  card: { borderWidth: 5, borderColor: "#1a5b4f", borderRadius: 16, marginBottom: 12, width: "100%" },
  cardTitle: { color: "#ffffff", fontSize: 15, marginBottom: 5, fontFamily: "Montt" },
  cardContainer: {padding: 15,  flexDirection: "row", justifyContent: "space-between", alignItems: "center"},
  skillBadge: { margin: 5, backgroundColor: "#e2db1c", padding: 8, borderRadius: 8 },
  badgeText: { fontSize: 12, color: "#1a5b4f", fontFamily: "Mont" },
  acceptedBadge: { margin: 5, backgroundColor: "#ffeeba", padding: 8, borderRadius: 8, alignItems: "center" },

  messageBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: "red", marginLeft: 6 },
  categoryBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: "red", marginLeft: 4 },
  pickerWrapper: {
  width: "90%",
  marginBottom: 10,
  zIndex: 50,
},

pickerButton: {
  borderWidth: 1,
  borderColor: "#1a5b4f",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: "#fff",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

pickerButtonText: {
  fontFamily: "Montt",
  fontSize: 15,
  color: "#333",
},

pickerArrow: {
  fontSize: 16,
  color: "#3e9040",
  fontFamily: "Montt",
},

pickerDropdown: {
  marginTop: 6,
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#d6d6d6",
  borderRadius: 12,
  overflow: "hidden",
},

pickerOption: {
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#ececec",
},

pickerOptionActive: {
  backgroundColor: "#eef8ee",
},

pickerOptionText: {
  fontFamily: "Mont",
  color: "#333",
},

pickerOptionTextActive: {
  fontFamily: "Montt",
  color: "#1a5b4f",
},
});