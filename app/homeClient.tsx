import { useFocusEffect } from '@react-navigation/native';
import { useFonts } from "expo-font";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, ImageBackground, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import logo from "../assets/briconnect33.png";
import fond from "../assets/convert_1.png";
import msg from "../assets/icons/enveloppe.png";
import modifier from "../assets/icons/modifier.png";
import notifIcon from "../assets/icons/notif.png";
import settings from "../assets/icons/settings.png";
import share from "../assets/icons/share.png";
import star from "../assets/icons/star.png";
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
  unreadType?: "message" | "deal" | "update";
  createdAt?: string;
  views?: number;
};

type ProfileType = {
  _id?: string;
  name?: string;
  location?: string;
  profileImage?: { url?: string };
  averageRating?: number;
};

const defaultAvatar = "https://res.cloudinary.com/dwjssp2pd/image/upload/v1775330960/default_client.png";


export default function HomeClient() {
  const router = useRouter();
  const { logout } = useContext(AuthContext)!;
  const { apiFetch } = useApi();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [requestView, setRequestView] = useState<"requests" | "completed">("requests");
  const [pickerOpen, setPickerOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiFetch("/notifications"); // ✅ PAS unread-count
      setNotifications(res); // ✅ on remplit le tableau
      setUnreadCount(res.filter((n: any) => !n.isRead).length);
    } catch (err) {
      console.error("Erreur notifications", err);
    }
  }, []);

const shareApp = async () => {
    try {
      await Share.share({
        message:
          `Découvre Briconnect !\n` +
          `Trouvez un bricoleur facilement\n` +
          `👉 https://brico-8fih.onrender.com/download`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const scrollY = new Animated.Value(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  const getUnreadIcon = (type?: string) => {
    switch (type) {
      case "message":
        return msg;
      case "review":
        return star;
      case "deal":
        return notifIcon;
      default:
        return notifIcon;
    }
  };


  const getRequestUnreadType = (requestId: string) => {
    const notif = notifications.find(
      n =>
        n.data?.requestId?.toString() === requestId &&
        !n.isRead
    );

    return notif?.type || null;
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const settingsOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.5], // 👈 devient transparent
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

  const formatRating = (value?: number) => {
    if (value == null) return "0";
    const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  const [requests, setRequests] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);

  const badgeBlink = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(badgeBlink, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(badgeBlink, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [badgeBlink]);


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

  console.log("NOTIFICATIONS:", notifications);
  console.log(
    "UNREAD:",
    notifications.filter(n => !n.isRead)
  );

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
      fetchNotifications(); // ✅ AJOUT ICI
    }, [fetchRequests, fetchNotifications])
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
        <ActivityIndicator color={"#1a5b4f"} />
        <Text style={{fontFamily: "Londrinak", color: "#1a5b4f"}}>Chargement des demandes...</Text>
      </View>
    );
  }

  if (!fontsLoaded) return null;

  return (
    <ImageBackground source={fond} style={{ flex: 1 }}>
      <Animated.View style={{ opacity: headerOpacity, flexDirection: "row", alignItems: "center", position: "relative", top: 30, paddingBottom: 15 }}>
        <Image source={logo} style={{ height: 60, width: 60 }} />
        <Text style={{ fontFamily: "Montt", fontSize: 16 }}>Accueil</Text>
        </Animated.View>

              <Animated.View
          style={{
            position: "absolute",
            top: 70,
            right: 15,
            zIndex: 99,
            opacity: settingsOpacity,
            flexDirection: "row",
            alignItems: "center",
            gap: 6
          }}
        >
          <TouchableOpacity onPress={shareApp}
    accessible
  accessibilityRole="button"
  accessibilityLabel="Partager"
  accessibilityHint={`Partager l'application`}>
    <Image source={share} style={{ height: 26, width: 26 }} />
  </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/settings" })}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Paramètres"
          accessibilityHint={`Accéder aux paramètres`} >
          <Image source={settings} style={{ height: 40, width: 40 }} />
        </TouchableOpacity>
      </Animated.View>
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
            width: 390,
            height: 160,
            paddingInline: 20,
            opacity: fadeOut,
            transform: [{ translateY }, { scale }],
          }}
        >
          <View style={{ width: "100%", alignItems: "center", position: "absolute", zIndex: 99, bottom: 115 }}>
            <Image
              source={{ uri: profile?.profileImage?.url || defaultAvatar }}
              style={styles.avatar}
              accessible={false}
            />
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/profileClient" })}
              style={styles.profileButton}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Modifier profl"
              accessibilityHint={`Modifier mon profil`}
            >
              <Image source={modifier} style={{ width: 20, height: 20 }} />
            </TouchableOpacity>
          </View>
          <LinearGradient
            colors={["#30a590", "#1a5b4f", "#1a5b4f"]}
            style={{ width: "100%", alignItems: "center", paddingInline: 20, paddingTop: 54, paddingBottom: 24, borderRadius: 20, gap: 4 }}
            accessible
            accessibilityLabel={`Profil de ${profile?.name}, localisation ${profile?.location}, note ${formatRating(profile?.averageRating)}`}>
            <Text style={{ fontFamily: "Montt", fontSize: 16, color: "white", letterSpacing: 0.3 }}>{profile?.name}</Text>
            {profile?.location &&
              <Text style={{ fontFamily: "Montt", fontSize: 14, color: "white", letterSpacing: 0.3 }}>{profile?.location}</Text>
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
        <TouchableOpacity
  activeOpacity={0.9}
  onPress={() => router.push("/createRequestForm")}
  onPressIn={onPressIn}
  onPressOut={onPressOut}
  style={{ marginBottom: 25 }}
  accessible
  accessibilityRole="button"
  accessibilityLabel="Créer une nouvelle demande"
>
  <Animated.View
    style={{
      transform: [{ scale: scaleAnim }],
    }}
  >
    <LinearGradient
      colors={["#38b79f", "#1a5b4f"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: 320,
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 22,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        shadowColor: "#1a5b4f",
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: {
          width: 0,
          height: 6,
        },
        elevation: 8,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: "rgba(255,255,255,0.18)",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 14,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 24,
            fontFamily: "Montt",
          }}
        >
          +
        </Text>
      </View>

      <View>
        <Text
          style={{
            color: "#fff",
            fontFamily: "Montt",
            fontSize: 17,
          }}
        >
          Nouvelle demande
        </Text>

        <Text
          style={{
            color: "rgba(255,255,255,0.85)",
            fontFamily: "Mont",
            fontSize: 12,
            marginTop: 2,
          }}
        >
          Décrivez votre besoin en quelques clics
        </Text>
      </View>
    </LinearGradient>
  </Animated.View>
</TouchableOpacity>
        <View style={styles.pickerWrapper}>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setPickerOpen(prev => !prev)}
            activeOpacity={0.8}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Choisir une vue"
            accessibilityHint="Ouvre ou ferme la liste des options"
            accessibilityState={{ expanded: pickerOpen }}
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
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={requestViewLabels[option]}
                  accessibilityHint="Sélectionner cette vue"
                  accessibilityState={{ selected: requestView === option }}
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
            <Text
              style={{ fontFamily: "Londrina", fontSize: 16 }}
              accessible
              accessibilityLabel="Aucune demande active">Aucune demande active</Text>
          ) : (
            filteredRequests.map((item) => {
              const unreadType = getRequestUnreadType(item._id);
              return (

                <View
                  key={item._id}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, width: 360, justifyContent: "center" }}
                >
                  <TouchableOpacity
                    style={{ width: 315, shadowColor: "#000",
  shadowOpacity: 0.82,
  shadowRadius: 8,
  shadowOffset: {
    width: 0,
    height: 4,
  },

  elevation: 6, }}
                    onPress={() => router.push(`/requestDetailClient?id=${item._id}`)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Demande ${item.title}, catégorie ${item.category}, budget ${item.budget} euros, statut ${item.status}`}
                    accessibilityHint="Ouvrir les détails de la demande"
                  >
                    <View style={styles.card}>
                      <View style={styles.cardHeader}>

    <View style={{width: "75%"}}>

        <Text style={styles.cardTitle}>
            {item.title.slice(0,1).toUpperCase() + item.title.slice(1, item.title.length)}
        </Text>

        <Text style={styles.cardDate}>
            {formatRelativeDate(item.createdAt)}
        </Text>

    </View>

    <View style={styles.viewsBadge}>
        <Text style={styles.viewsText}>
            👀 {item?.views ?? 0} {item?.views === 1 ? "vue" : "vues"}
        </Text>
    </View>

</View>
                      <View style={styles.cardContainer}>
                        <View style={styles.badges}>

    <View style={styles.badge}>
        <Text style={{fontFamily: "Mont"}}>🔧 {item.category}</Text>
    </View>

    <View style={styles.badge}>
        <Text style={{fontFamily: "Mont"}}>💰 {item.budget} €</Text>
    </View>

</View>


                      <View style={styles.cardFooter}>

    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor:
            item.status === "open"
              ? "#dff7e8"
              : item.status === "in_progress"
              ? "#fff3d7"
              : "#dcecff",
        },
      ]}
    >
      <Text
        style={{
          fontFamily: "Montt",
          color:
            item.status === "open"
              ? "#1b8d4b"
              : item.status === "in_progress"
              ? "#c28a00"
              : "#2d72d9",
        }}
      >
        {item.status === "open"
          ? "Ouvert"
          : item.status === "in_progress"
          ? "En cours"
          : "Terminé"}
      </Text>
    </View>

    <View style={{ flexDirection: "row", alignItems: "center" }}>

      {unreadType && (
        <Animated.Image
          source={getUnreadIcon(item.unreadType)}
          style={[
            styles.unreadIcon,
            {
              position: "relative",
              top: 0,
              right: 0,
              marginRight: 10,
              opacity: badgeBlink,
            },
          ]}
        />
      )}

      <Text style={styles.openArrow}>
        →
      </Text>

    </View>

  </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                  {item.status != "completed" &&
                    <TouchableOpacity
                      onPress={() => handleDelete(item._id)}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel="Supprimer la demande"
                      accessibilityHint="Supprimer définitivement cette demande"
                      style={{position: "absolute", right: -5}}
                    >
                      <Image source={trash} style={{ height: 20, width: 20 }} />
                    </TouchableOpacity>}
                </View>
              )
            }
            )
          )}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={{ marginBlock: 10 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Déconnexion"
          accessibilityHint="Se déconnecter du compte"
        >
          <Text style={{ fontFamily: "Kanito", color: "red", fontSize: 15 }}>Deconnexion</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', paddingTop: 60, paddingBottom: 160, gap: 10 },
  avatar: { height: 90, width: 90, borderRadius: 45, borderWidth: 2, borderColor: "#fcfcfc" },
  profileButton: { padding: 5, borderRadius: 50, backgroundColor: "#999999", position: "absolute", bottom: 5, right: 8, borderColor: "#f5f5f5", borderWidth: 1 },
  title: { fontSize: 24, fontFamily: 'Montt', marginBottom: 20, textAlign: 'center' },
card: {
  backgroundColor: "#fff",
  borderRadius: 22,
  overflow: "hidden",

  
  marginBottom: 18,
  borderWidth: 1,
  borderColor: "#1a5b4f"
},
  cardTitle: { color: "#ffffff", fontSize: 19, marginBottom: 5, fontFamily: "Londrinak" },
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
  unreadIcon: {
    width: 22,
    height: 22,
    position: "absolute",
    top: 8,
    right: 8,
  },
  requestsContainer: { width: "100%", paddingHorizontal: 20, alignItems: "center" },
  cardContainer: { padding: 12, flexDirection: "column", justifyContent: "space-between" },
cardHeader: {
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",

    padding:18,

    backgroundColor:"#1a5b4f",
},

cardDate:{
    color:"#d9efe9",
    fontFamily:"Mont",
    marginTop:4,
    fontSize:12,
},

viewsBadge:{
    backgroundColor:"rgba(255,255,255,0.15)",
    padding: 6,
    borderRadius:20,
},

viewsText:{
    color:"white",
    fontFamily:"Mont",
    fontSize: 12
},
badges:{
    flexDirection:"row",
    flexWrap:"wrap",
    gap:10,
    paddingBottom: 14
},

badge:{
    backgroundColor:"#eef7f4",
    paddingHorizontal:14,
    paddingVertical:8,
    borderRadius:18,
},
cardFooter: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",

  borderTopWidth: 1,
  borderTopColor: "#ededed",

  paddingTop: 14,
},

statusBadge: {
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 18,
},

openArrow: {
  fontSize: 22,
  color: "#1a5b4f",
  fontFamily: "Montt",
},
});