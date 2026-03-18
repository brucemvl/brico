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
  status: "open" | "in_progress" | "accepted" | "completed" | "cancelled";
  hasUnread?: boolean;
};

const categories = ["Plomberie", "Peinture", "Agencement", "Electricité", "Carrelage", "divers"];



export default function HomePro() {
  type ProfileType = {
    name: string;
    profileImage?: { url: string };
    averageRating: number
  };

  const router = useRouter();
  const { apiFetch, logout } = useApi();
  const [profile, setProfile] = useState<ProfileType | null>(null);

  const [requests, setRequests] = useState<RequestType[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<"skills" | "all" | string>("skills");
  const [loading, setLoading] = useState(true);

  const scrollY = new Animated.Value(0);

  const headerOpacity = scrollY.interpolate({
  inputRange: [0, 100],
  outputRange: [1, 0],
  extrapolate: "clamp",
});

  const [fontsLoaded] = useFonts({ 
    "Londrina": require("../assets/fonts/Londrina/LondrinaSolid-Regular.ttf"), 
    "Londrinak": require("../assets/fonts/Londrina/LondrinaSolid-Black.ttf"), 
    "Mont": require("../assets/fonts/Montserrat/Montserrat-Regular.ttf"), 
    "Montt": require("../assets/fonts/Montserrat/Montserrat-Bold.ttf"), 
  });

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

  // 🔹 Logique de filtrage
  const filteredRequests = (() => {
    const validStatuses: RequestType["status"][] = ["open", "in_progress"];
    const filtered = requests.filter(r => validStatuses.includes(r.status));
    switch (activeFilter) {
      case "skills":
        return filtered.filter(r => skills.includes(r.category));
      case "all":
        return filtered;
      default:
        return filtered.filter(r => r.category === activeFilter);
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
<LinearGradient colors={["#f3f3f3", "#f3f3f3", "#f3f3f3f1" ]} style={styles.header }>
  <Animated.Text style={{ fontFamily: "Montt", opacity: headerOpacity }}>Mon Profil</Animated.Text>
</LinearGradient>    
<Animated.ScrollView
  contentContainerStyle={styles.container}
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  )}
  scrollEventThrottle={6}
>      

<View style={{alignItems: "center", gap: 4, marginBlock: 20}}>
      <Image source={{ uri: profile?.profileImage?.url }} style={styles.avatar} />
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/profilePro" })}
        style={styles.profileButton}
      >
        <Image source={modifier} style={{width: 20, height: 20}}/>
      </TouchableOpacity>
      <Text style={{fontFamily: "Londrinak", fontSize: 16 }}>{profile?.name}</Text>

      {/* ⭐ Rating pro */}
{profile?.averageRating && (
  <View style={{ flexDirection: "row"}}>
    {[1,2,3,4,5].map(i => (
      <Text key={i} style={{ fontSize: 16 }}>
        {i <= Math.round(profile.averageRating) ? "⭐" : "☆"}
      </Text>
    ))}
  </View>
)}
    <Text style={{fontFamily: "Mont"}}>({profile?.averageRating})</Text>

</View>
      <Text style={styles.title}>Demandes disponibles</Text>

      {/* 🔹 Boutons filtres */}
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

      {/* 🔹 Liste des demandes */}
      <View style={styles.requestsContainer}>
        {filteredRequests.length === 0 ? (
          <Text style={{fontFamily: "Londrina", fontSize: 16, marginBlock: 20}}>Aucune demande disponible</Text>
        ) : (
          filteredRequests.map(item => {
            const isMatchingSkill = skills.includes(item.category);
            return (
              <TouchableOpacity key={item._id} onPress={() => openRequest(item)} style={{ width: "100%" }}>
                <View style={styles.card}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#3E9040", paddingBlock: 6, paddingInline: 4 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {item.hasUnread && <View style={styles.messageBadge} />}
                  </View>
<View style={styles.cardContainer}>
                  <Text style={{fontFamily: "Londrina", fontSize: 16}}>Catégorie : {item.category}</Text>
                  <Text style={{fontFamily: "Londrina", fontSize: 16}}>Lieu : {item.location}</Text>
                  <Text style={{fontFamily: "Londrina", fontSize: 16}}>Budget : {item.budget}€</Text>
                  </View>

                  {item.status === "accepted" && (
                    <View style={styles.acceptedBadge}>
                      <Text style={{ fontSize: 12 }}>🤝 Accord conclu</Text>
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
  container: { paddingTop: 120, alignItems: "center", paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontFamily: "Montt", marginBottom: 15 },
  avatar: { height: 90, width: 90, resizeMode: "contain", borderRadius: 45 },
  profileButton: { alignSelf: "flex-end",  padding: 5, borderRadius: 50, backgroundColor: "#999999", position: "absolute", top: 60, borderColor: "#f5f5f5", borderWidth: 1 },
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
  card: { borderWidth: 4, borderColor: "#3e9040", borderRadius: 10, marginBottom: 12, width: "100%" },
  cardTitle: { color: "#ffffff", fontSize: 16, marginBottom: 5, fontFamily: "Montt" },
  cardContainer: {padding: 15, gap: 4},
  skillBadge: { margin: 5, backgroundColor: "#f0ea27", padding: 8, borderRadius: 8 },
  badgeText: { fontSize: 12, color: "#155724", fontFamily: "Mont" },
  acceptedBadge: { marginTop: 8, backgroundColor: "#ffeeba", padding: 5, borderRadius: 5, alignItems: "center" },

  messageBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: "red", marginLeft: 6 },
  categoryBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: "red", marginLeft: 4 },
});