import { useFocusEffect } from '@react-navigation/native';
import { useFonts } from "expo-font";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, ImageBackground, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import fond from "../assets/convert_1.png";
import modifier from "../assets/icons/modifier.png";
import trash from "../assets/icons/trash2.png";
import { AuthContext } from '../context/AuthContext';
import { useApi } from "../services/api";


type RequestType = {
  _id: string;
  category: string;
  budget: number,
  status: "open" | "in_progress" | "completed";
  client: string;
  title: string;
  hasUnread: boolean;
  createdAt?: string;
};

type ProfileType = {
  _id?: string;
  name?: string;
  location?: string;
  profileImage?: { url?: string };
  averageRating?: number;
};

const defaultAvatar = "https://res.cloudinary.com/dwjssp2pd/image/upload/v1773074497/default_client.jpg";


export default function HomeClient() {
  const router = useRouter();
  const { logout } = useContext(AuthContext)!;
  const { apiFetch } = useApi();
  const [profile, setProfile] = useState<ProfileType | null>(null);

  const [requestView, setRequestView] = useState<"requests" | "completed">("requests");
  const [pickerOpen, setPickerOpen] = useState(false);

  const scrollY = new Animated.Value(0);

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

  const [fontsLoaded] = useFonts({ 
      "Londrina": require("../assets/fonts/Londrina/LondrinaSolid-Regular.ttf"), 
      "Londrinak": require("../assets/fonts/Londrina/LondrinaSolid-Black.ttf"), 
      "Mont": require("../assets/fonts/Montserrat/Montserrat-Regular.ttf"), 
      "Montt": require("../assets/fonts/Montserrat/Montserrat-Bold.ttf"), 
      "Kanit": require("../assets/fonts/Kanit/Kanit-Regular.ttf"), 
      "Kanitt": require("../assets/fonts/Kanit/Kanit-Bold.ttf"), 
      "Kanito": require("../assets/fonts/Kanit/Kanit-Medium.ttf"), 
    });

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const formatRating = (value?: number) => {
    if (value == null) return "0";
    const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  const [requests, setRequests] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);


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



  // 🔹 Fonction pour récupérer les demandes
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/requests/client");
      setRequests(data);
    } catch (err) {
      console.error("Erreur fetchRequests:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔹 Rafraîchit la liste à chaque retour sur cet écran
  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  // 🔹 Supprimer une demande
  const handleDelete = async (id: string) => {
    Alert.alert(
      "Supprimer la demande",
      "Êtes-vous sûr de vouloir supprimer cette demande ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/requests/${id}`, { method: "DELETE" });
              // On retire la demande du state pour mise à jour immédiate
              setRequests(prev => prev.filter(req => req._id !== id));
            } catch (err) {
              console.error("Erreur suppression :", err);
              Alert.alert("Erreur", "Impossible de supprimer cette demande.");
            }
          },
        },
      ]
    );
  };

  // 🔹 Déconnexion
  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const requestViewLabels: Record<"requests" | "completed", string> = {
    requests: "Demandes",
    completed: "Terminées",
  };

  const changeRequestView = (view: "requests" | "completed") => {
    setRequestView(view);
    setPickerOpen(false);
  };

  const filteredRequests = (() => {
    switch (requestView) {
      case "requests":
        return requests.filter(
          r => r.status === "open" || r.status === "in_progress"
        );
      case "completed":
        return requests.filter(
          r => r.status === "completed"
        );
      default:
        return requests;
    }
  })();


  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Chargement des demandes...</Text>
      </View>
    );
  }

      if (!fontsLoaded) return null;

  return (
    <ImageBackground source={fond} >
      <Animated.Text style={{ fontFamily: "Montt", opacity: headerOpacity, marginTop: 50, marginLeft: 10, fontSize: 16 }}>Accueil</Animated.Text>


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
          <View style={{ width: "100%", alignItems: "center", position: "absolute", zIndex: 99, bottom: profile?.location ? 120 : 100 }}>
            <Image
              source={{ uri: profile?.profileImage?.url || defaultAvatar }}
              style={styles.avatar}
            />
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/profileClient" })}
              style={styles.profileButton}
            >
              <Image source={modifier} style={{ width: 20, height: 20 }} />
            </TouchableOpacity>
          </View>
          <LinearGradient colors={["#30a590", "#1a5b4f", "#1a5b4f"]} style={{ width: "100%", alignItems: "center", paddingInline: 20, paddingTop: 54, paddingBottom: 24, borderRadius: 20, gap: 4 }}>
            <Text style={{ fontFamily: "Londrinak", fontSize: 16, color: "white", letterSpacing: 0.3 }}>{profile?.name}</Text>
            {profile?.location &&
              <Text style={{ fontFamily: "Londrinak", fontSize: 16, color: "white", letterSpacing: 0.3 }}>{profile?.location}</Text>
            }
            {/* ⭐ Rating pro */}
            {typeof profile?.averageRating === "number" && (
              <View style={{ flexDirection: "row" }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Text key={i} style={{ fontSize: 16, color: "white" }}>
                    {i <= Math.round(profile?.averageRating ?? 0) ? "⭐" : "☆"}
                  </Text>
                ))}
              </View>
            )}
            <Text style={{ fontFamily: "Mont", color: "white" }}>({formatRating(profile?.averageRating)})</Text>
          </LinearGradient>

        </Animated.View>
        <TouchableWithoutFeedback
    accessible
  accessibilityRole="button"
  accessibilityLabel="Nouvelle demande"
  accessibilityHint="Poster une noueelle demande"
      onPress={() => router.push('/createRequestForm')}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <LinearGradient colors={["#30a590", "#1a5b4f"]} style={{ padding: 12, marginBottom: 20, backgroundColor: "#1a5b4f", borderRadius: 14 }}>
          <Text style={{ color: "white", fontSize: 15, fontFamily: "Kanitt" }}>+ Demande</Text>
        </LinearGradient>
        </Animated.View>
        </TouchableWithoutFeedback>
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
              {(["requests", "completed"] as const).map(option => (
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
            ? "Demandes en cours"
            : "Demandes terminées"}
        </Text>

        <View style={styles.requestsContainer}>

          {filteredRequests.length === 0 ? (
            <Text>Aucune demande active</Text>
          ) : (
            filteredRequests.map((item) => (
              <View
                key={item._id}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, width: "90%", justifyContent: "center" }}
              >
                <TouchableOpacity style={{ width: "90%" }} onPress={() => router.push(`/requestDetailClient?id=${item._id}`)}>
                  <View style={styles.card}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#1a5b4f", paddingBlock: 6, paddingInline: 6 }}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={{ fontFamily: "Montt", fontSize: 10, color: "#ffffff" }}>
                        {formatDate(item.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.cardContainer}>
                      <View style={{ gap: 4 }}>

                        <Text style={{ fontFamily: "Londrina", fontSize: 16, color: "#783516" }}>Catégorie : {item.category}</Text>
                        <Text style={{ fontFamily: "Londrina", fontSize: 16, color: "#783516" }}>Budget : {item.budget}€</Text>
                        <Text style={{fontFamily: "Kanito", color: item.status === "open" ? "green" : item.status === "in_progress" ? "#bdc008" : "red"}}>Statut: {item.status === "open" ? "Ouvert" : item.status === "in_progress" ? "En cours" : "Terminé"}</Text>
                      </View>

                      {item.hasUnread && <View style={styles.redDot} />}
                    </View>
                  </View>
                </TouchableOpacity>
{ item.status != "completed" &&
                <TouchableOpacity onPress={() => handleDelete(item._id)}>
                  <Image source={trash} style={{ height: 20, width: 20 }} />
                </TouchableOpacity>}
              </View>
            ))
          )}
        </View>

        <TouchableOpacity onPress={handleLogout} style={{marginBlock: 10}}>
          <Text style={{fontFamily: "Mont", color: "red", fontSize: 15}}>Deconnexion</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', paddingTop: 60, paddingBottom: 160 },
  avatar: { height: 90, width: 90, borderRadius: 45, borderWidth: 2, borderColor: "#fcfcfc" },
  profileButton: { padding: 5, borderRadius: 50, backgroundColor: "#999999", position: "absolute", bottom: 5, right: 8, borderColor: "#f5f5f5", borderWidth: 1 },
  title: { fontSize: 24, fontFamily: 'Montt', marginBottom: 20, textAlign: 'center' },
  card: { borderWidth: 5, borderColor: "#1a5b4f", borderRadius: 16, marginBottom: 12, backgroundColor: "#f3f3f3" },
  cardTitle: { color: "#ffffff", fontSize: 14, marginBottom: 5, fontFamily: "Montt" },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "red",
    position: "absolute",
    top: 8,
    right: 8,
  },

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
    color: "#1a5b4f",
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
  requestsContainer: { width: "100%", paddingHorizontal: 20, alignItems: "center" },
  cardContainer: { padding: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },


});