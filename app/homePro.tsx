import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
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

const categories = ["plomberie", "peinture", "agencement", "électricité", "divers"];

export default function HomePro() {
  type ProfileType = {
    name: string;
    profileImage?: { url: string };
  };

  const router = useRouter();
  const { apiFetch, logout } = useApi();
  const [profile, setProfile] = useState<ProfileType | null>(null);

  const [requests, setRequests] = useState<RequestType[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<"skills" | "all" | string>("skills");
  const [loading, setLoading] = useState(true);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/profilePro" })}
        style={styles.profileButton}
      >
        <Text>Mon Profil</Text>
      </TouchableOpacity>

      {profile?.profileImage?.url && <Image source={{ uri: profile.profileImage.url }} style={styles.avatar} />}
      <Text style={{ marginBottom: 10 }}>{profile?.name}</Text>

      <Text style={styles.title}>Demandes disponibles</Text>

      {/* 🔹 Boutons filtres */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === "skills" && styles.activeFilter]}
          onPress={() => setActiveFilter("skills")}
        >
          <Text>Mes compétences</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, activeFilter === "all" && styles.activeFilter]}
          onPress={() => setActiveFilter("all")}
        >
          <Text>Toutes</Text>
        </TouchableOpacity>

        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterButton, activeFilter === cat && styles.activeFilter]}
            onPress={() => setActiveFilter(cat)}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text>{cat}</Text>
              {hasUnreadByCategory[cat] && <View style={styles.categoryBadge} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* 🔹 Liste des demandes */}
      <View style={styles.requestsContainer}>
        {filteredRequests.length === 0 ? (
          <Text>Aucune demande disponible</Text>
        ) : (
          filteredRequests.map(item => {
            const isMatchingSkill = skills.includes(item.category);
            return (
              <TouchableOpacity key={item._id} onPress={() => openRequest(item)} style={{ width: "100%" }}>
                <View style={styles.card}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {item.hasUnread && <View style={styles.messageBadge} />}
                  </View>

                  <Text>Catégorie : {item.category}</Text>
                  <Text>Lieu : {item.location}</Text>
                  <Text>Budget : {item.budget}€</Text>

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

      <TouchableOpacity onPress={async () => { await logout(); router.replace("/"); }} style={{ marginTop: 20 }}>
        <Text>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 80, alignItems: "center", paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  avatar: { height: 70, width: 70, resizeMode: "contain", borderRadius: 35, marginBottom: 5 },
  profileButton: { alignSelf: "flex-end", margin: 20, borderWidth: 1, backgroundColor: "green", padding: 5, borderRadius: 10 },

  filtersContainer: { marginBottom: 15, flexWrap: "wrap", flexDirection: "row", gap: 6, justifyContent: "center" },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  activeFilter: { backgroundColor: "#ddd" },

  requestsContainer: { width: "100%", paddingHorizontal: 20, alignItems: "center" },
  card: { padding: 15, borderWidth: 1, borderRadius: 10, marginBottom: 12, width: "100%" },
  cardTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 5 },
  skillBadge: { marginTop: 8, backgroundColor: "#d4edda", padding: 5, borderRadius: 5 },
  badgeText: { fontSize: 12, color: "#155724" },
  acceptedBadge: { marginTop: 8, backgroundColor: "#ffeeba", padding: 5, borderRadius: 5, alignItems: "center" },

  messageBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: "red", marginLeft: 6 },
  categoryBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: "red", marginLeft: 4 },
});