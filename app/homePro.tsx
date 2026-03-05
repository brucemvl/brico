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
  status: string;
};

const categories = ["plomberie", "peinture", "agencement", "électricité", "divers"];

export default function HomePro() {
  type ProfileType = {
  name: string;
  profileImage?: {
    url: string;
  };
};

  const router = useRouter();
  const { apiFetch, logout } = useApi();
const [profile, setProfile] = useState<ProfileType | null>(null);

  useEffect(() => {
  apiFetch("/users/me").then(data => setProfile(data));
}, []);

  const [requests, setRequests] = useState<RequestType[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<"skills" | "all" | string>("skills");
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch demandes + compétences du pro
  const fetchRequests = async () => {
  console.log("🔄 Fetch start");
  setLoading(true);

  try {
    const data = await apiFetch("/requests/pro");
    console.log("✅ Data reçue:", data);

    setRequests(data.requests || []);
    setSkills(data.skills || []);
  } catch (err) {
    console.error("❌ Erreur fetch pro:", err);
  } finally {
    console.log("🏁 Fin fetch");
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
    switch (activeFilter) {
      case "skills":
        return requests.filter(r => skills.includes(r.category) && r.status === "open");
      case "all":
        return requests.filter(r => r.status === "open");
      default:
        return requests.filter(r => r.category === activeFilter && r.status === "open");
    }
  })();

  

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
        style={{alignSelf: "flex-end", margin: 20, borderWidth: 1, backgroundColor: "green", padding: 5, borderRadius: 10}}
      >
        <Text>Mon Profil</Text>
      </TouchableOpacity>
<Image source={{ uri: profile?.profileImage?.url }} style={styles.avatar} />
<Text>{profile?.name}</Text>
      <Text style={styles.title}>Demandes disponibles</Text>

      {/* 🔹 Boutons filtres */}
      <View style={{ marginBottom: 15, flexWrap: "wrap", flexDirection: "row", gap: 6, justifyContent: "center" }}>
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
            <Text>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

<View style={{ width: "100%", padding: 20, justifyContent: "center", alignItems: "center"}}>
      {/* 🔹 Liste des demandes */}
      {filteredRequests.length === 0 ? (
        <Text>Aucune demande disponible</Text>
      ) : (
        filteredRequests.map(item => {
          const isMatchingSkill = skills.includes(item.category);

          return (
            <TouchableOpacity
              key={item._id}
              onPress={() =>
                router.push({ pathname: "/requestDetailPro", params: { id: item._id } })
              }
                              style={{width: "100%"}}

            >
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text>Catégorie : {item.category}</Text>
                <Text>Lieu : {item.location}</Text>
                <Text>Budget : {item.budget}€</Text>

                {isMatchingSkill && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Correspond à vos compétences</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}
      </View>

      <TouchableOpacity
  onPress={async () => {
    await logout();
    router.replace("/");
  }}
>
  <Text>Logout</Text>
</TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 80, alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  avatar: {height: 70, width: 70, resizeMode: "contain"},
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  activeFilter: {
    backgroundColor: "#ddd",
  },
  card: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 5 },
  badge: { marginTop: 8, backgroundColor: "#d4edda", padding: 5, borderRadius: 5 },
  badgeText: { fontSize: 12, color: "#155724" },
});