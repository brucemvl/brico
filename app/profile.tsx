import BackButton from "@/components/BackButton";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  ImageBackground,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import logo from "../assets/briconnect33.png";
import fond from "../assets/convert_1.png";
import distance from "../assets/icons/distance.png";
import { AuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";


const calculateDistanceKm = (
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
) => {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const R = 6371;

  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);

  const lat1 = toRad(point1.latitude);
  const lat2 = toRad(point2.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const defaultAvatar =
  "https://res.cloudinary.com/dwjssp2pd/image/upload/v1773074497/default_pro.jpg";

export default function Profile() {
  const { apiFetch } = useApi();
  const params = useLocalSearchParams();
  const userId = params.id as string;
  const router = useRouter();

  const authContext = useContext(AuthContext);
const authUser = authContext?.user;

const [clientCoords, setClientCoords] = useState<{
  latitude: number;
  longitude: number;
} | null>(null);

  const [user, setUser] = useState<any>(null);

  const [messageModalVisible, setMessageModalVisible] = useState(false);
const [firstMessage, setFirstMessage] = useState("");
const [clientRequests, setClientRequests] = useState<any[]>([]);
const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
const [sendingMessage, setSendingMessage] = useState(false);

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

const isModalVisible = selectedImageIndex !== null;

const [reviewImagesModal, setReviewImagesModal] = useState<any[]>([]);

const translateX = useState(new Animated.Value(0))[0];

const openImageModal = (images: any[], index: number) => {
  setReviewImagesModal(images);
  setSelectedImageIndex(index);
};

const closeImageModal = () => {
  setSelectedImageIndex(null);
};

const showPreviousImage = () => {
  if (!reviewImagesModal.length || selectedImageIndex === null) return;

  setSelectedImageIndex((prev) => {
    if (prev === null) return null;
    return prev === 0 ? reviewImagesModal.length - 1 : prev - 1;
  });
};

const showNextImage = () => {
  if (!reviewImagesModal.length || selectedImageIndex === null) return;

  setSelectedImageIndex((prev) => {
    if (prev === null) return null;
    return prev === reviewImagesModal.length - 1 ? 0 : prev + 1;
  });
};

const openProfileImage = () => {
  const profileImage = user?.profileImage?.url;

  if (!profileImage) return;

  setReviewImagesModal([{ url: profileImage }]);
  setSelectedImageIndex(0);
};

const [coords, setCoords] = useState<{
  latitude: number;
  longitude: number;
} | null>(null);

useEffect(() => {
  const loadClientLocation = async () => {
    if (!authUser?.userId || authUser.role !== "client") {
      setClientCoords(null);
      return;
    }

    try {
      const client = await apiFetch(`/users/${authUser.userId}`);

      const latitude = Number(client?.locationCoordinates?.latitude);
      const longitude = Number(client?.locationCoordinates?.longitude);

      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        setClientCoords({ latitude, longitude });
      } else {
        setClientCoords(null);
      }
    } catch (err) {
      console.log("Erreur récupération localisation client :", err);
      setClientCoords(null);
    }
  };

  loadClientLocation();
}, [authUser?.userId, authUser?.role]);

const distanceKm =
  clientCoords && coords
    ? calculateDistanceKm(clientCoords, coords)
    : null;

    useEffect(() => {
  const loadClientRequests = async () => {
    if (authUser?.role !== "client") return;

    try {
      const data = await apiFetch("/requests/client");
      setClientRequests(data?.requests || []);
    } catch (err) {
      console.log("Erreur chargement demandes client :", err);
    }
  };

  loadClientRequests();
}, [authUser?.userId, authUser?.role]);

const skillIcons = {
   Plomberie: require("../assets/icons/plomberie.png"),
    Electricité: require("../assets/icons/electricite.png"),
     Peinture: require("../assets/icons/peinture.png"),
      Carrelage: require("../assets/icons/carrelage.png"),
       Agencement: require("../assets/icons/agencement.png"),
        Jardinage: require("../assets/icons/jardinage.png"),
         Divers: require("../assets/icons/divers.png"),
         Demenagement: require("../assets/icons/demenagement.png"),
         };

const panResponder = React.useRef(
  PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 20;
    },

    onPanResponderMove: (_, gestureState) => {
      translateX.setValue(gestureState.dx);
    },

    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 120) {
        // swipe droite → image précédente
        showPreviousImage();
      } else if (gestureState.dx < -120) {
        // swipe gauche → image suivante
        showNextImage();
      }

      // reset position
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
  })
).current;

  const scrollY = new Animated.Value(0);

  const formatRating = (value?: number) => {
  if (value == null) return "0";
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};
  
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

  

useEffect(() => {
  const geocode = async () => {
    if (!user?.location) return;

    try {
      const location = user.location.trim();

      // Ex: "Bagneux (92)"
      const match = location.match(/^(.*?)\s*\((\d+)\)$/);

      let query = `${location}, France`;

      if (match) {
        const city = match[1].trim();
        const dept = match[2].trim();

        query = `${city}`;

        // fallback si un autre département arrive plus tard
        if (dept === "75") query = `${city}, Paris, Île-de-France, France`;
        if (dept === "93") query = `${city}, Seine-Saint-Denis, Île-de-France, France`;
        if (dept === "94") query = `${city}, Val-de-Marne, Île-de-France, France`;
        if (dept === "91") query = `${city}, Essonne, Île-de-France, France`;
        if (dept === "77") query = `${city}, Seine-et-Marne, Île-de-France, France`;
        if (dept === "78") query = `${city}, Yvelines, Île-de-France, France`;
        if (dept === "95") query = `${city}, Val-d'Oise, Île-de-France, France`;
        if (dept === "92") query = `${city}, Hauts-de-Seine, Île-de-France, France`;
      }

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await res.json();

      if (data.length > 0) {
        setCoords({
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        });
      } else {
        console.log("Aucun résultat pour :", query);
      }
    } catch (err) {
      console.log("Erreur géocodage", err);
    }
  };

  geocode();
}, [user?.location]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await apiFetch(`/users/${userId}`);
        setUser(data);
      } catch (err) {
        console.log(err);
      }
    };

    if (userId) loadUser();
  }, [userId]);

  if (!user) return <View style={{flex: 1, justifyContent: "center", alignItems: "center"}}><Text style={{fontFamily: "Londrinak"}}>Chargement...</Text></View>;

  const parsedEquipment =
  typeof user.equipment === "string"
    ? JSON.parse(user.equipment)
    : user.equipment;


    const sendFirstMessage = async () => {
  if (!firstMessage.trim() || sendingMessage) return;

  try {
    setSendingMessage(true);

    const payload: {
      proId: string;
      content: string;
      requestId?: string;
    } = {
      proId: user._id,
      content: firstMessage.trim(),
    };

    if (selectedRequestId) {
      payload.requestId = selectedRequestId;
    }

    const conversation = await apiFetch("/conversations/direct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    setMessageModalVisible(false);
    setFirstMessage("");
    setSelectedRequestId(null);

    // Navigation vers l'écran de conversation à adapter à ta route Expo Router.
    router.push({
      pathname: "/messagesClient",
      params: { id: conversation._id },
    } as any);

  } catch (err: any) {
    console.log("Erreur envoi premier message :", err);
    Alert.alert(
      "Erreur",
      err?.message || "Impossible d'envoyer le message."
    );
  } finally {
    setSendingMessage(false);
  }
};

  return (
<ImageBackground source={fond} style={{flex: 1}}>
<Animated.View style={{opacity: headerOpacity,  flexDirection: "row", alignItems: "center", position: "relative", top: 30, paddingBottom: 15 }}>
    <Image source={logo} style={{height: 60, width: 60}}/>
    <Text style={{ fontFamily: "Montt" , fontSize: 16}}>Profil de {user?.name}</Text></Animated.View>
    <BackButton />
<Animated.ScrollView
  contentContainerStyle={styles.container}
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  )}
  scrollEventThrottle={6}
> 
      {/* HEADER */}
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
          <Pressable
  onPress={openProfileImage}
  style={styles.avatarPressable}
>
  <Image
    source={{
      uri: user.profileImage?.url || defaultAvatar
    }}
    style={styles.avatar}
  />
</Pressable>
              <LinearGradient colors={["#1a5b4f", "#30a590"]} style={{width: "85%", alignItems: "center", paddingBlock: 16, paddingInline: 10, borderRadius: 20, gap: 4, left: 25, justifyContent: "space-between"}}>
                <View style={styles.badges}>
  {user.proBadge && (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>✔️ SIRET vérifié</Text>
    </View>
  )}

  {user.verified && (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>🟦 Pro vérifié</Text>
    </View>
  )}

  {user.insured && (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>🛡 Assuré</Text>
    </View>
  )}

  {distanceKm !== null && (
  <View style={styles.badgeLoc}>
    <Image source={distance} style={{height: 20, width: 20}} />
  <Text style={styles.badgeLocationText}>
    À {distanceKm < 10
      ? distanceKm.toFixed(1).replace(".", ",")
      : Math.round(distanceKm)} km de vous
  </Text>
  </View>
)}
</View>
        
<View style={{alignItems: "center"}}>
        <Text style={styles.name}>{user.name}</Text>

         {user.location && (
          <Text style={styles.location}>📍 {user.location}</Text>
        )}


        </View>

        

        {user.averageRating > 0 && (
          <Text style={styles.rating}>
            ⭐ {formatRating(user?.averageRating)}/5
          </Text>
        )}
</LinearGradient>
       
      </Animated.View>

      {authUser?.role === "client" && user.role === "pro" && (
  <Pressable
    style={styles.messageButton}
    onPress={() => setMessageModalVisible(true)}
  >
    <Text style={styles.messageButtonText}>
      ✉️ Envoyer un message
    </Text>
  </Pressable>
)}

      {/* DESCRIPTION */}
      {user.description && (
        <View style={styles.section}>
          <Text style={styles.title}>Présentation</Text>
          <Text style={styles.text}>{user.description}</Text>
        </View>
      )}

      {/* COMPÉTENCES */}
{user.skills?.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.title}>Mes compétences</Text>

    <View style={styles.skillsContainer}>
      {user.skills.map((skill, i) => (
        <LinearGradient
          key={`${skill}-${i}`}
          colors={["#F0FFF9", "#59c39a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.skill}
        >
          <View style={styles.skillIconContainer}>
            <Image
              source={skillIcons[skill] || skillIcons.Divers}
              style={styles.skillIcon}
            />
          </View>

          <Text style={styles.skillText}>{skill}</Text>
        </LinearGradient>
      ))}
    </View>
  </View>
)}

      {/* ÉQUIPEMENT */}
      {user.equipment?.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.title}>Équipement</Text>

    <View style={[styles.skillsContainer, {gap: 6}]}>
      {parsedEquipment?.map((item: string, i: number) => (
        <LinearGradient key={i} style={styles.equipment} colors={["#F0FFF9", "#59c39a"]}>
          <Text style={styles.equipmentText}>{item}</Text>
        </LinearGradient>
      ))}
    </View>
  </View>
)}

      {/* PORTFOLIO */}
      {user.portfolio?.length > 0 && (
        <View style={[styles.section, {paddingInline: 0}]}>
          <Text style={[styles.title, {paddingInline: 20}]}>Travaux réalisés</Text>

          <View style={styles.portfolio}>
            {user.portfolio.map((img: any, index: number) => (
  <Pressable key={img._id} onPress={() => openImageModal(user.portfolio, index)}>
    <Image
      source={{ uri: img.url }}
      style={styles.portfolioImage}
    />
  </Pressable>
))}
          </View>
        </View>
      )}

      {coords && (
<View style={styles.section}>
<Text style={styles.title}>Localisation</Text>
<Text style={styles.locationText}>
📍 {user.location}
</Text>

<MapView
style={styles.map}
initialRegion={{
latitude: coords.latitude,
longitude: coords.longitude,
latitudeDelta: 0.05,
longitudeDelta: 0.05
}}
>
<Marker
coordinate={{
latitude: coords.latitude,
longitude: coords.longitude
}}
title={user.name}
/>
</MapView>

</View>
)}

      {user.ratings?.length > 0 && (
<View style={styles.section}>
  <View style={{flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 4, paddingBottom: 10}}>
<Text style={styles.title}>Avis clients</Text>
<Text style={{fontFamily: "Montt", fontSize: 18}}>{formatRating(user?.averageRating)} ⭐</Text>
</View>
{user.ratings.map((rating:any)=>(
<View key={rating._id} style={styles.review}>
<View style={{flexDirection: "row", justifyContent: "space-between", width: "100%"}}>
<Text style={styles.reviewStars}>
{"⭐".repeat(rating.score)}
</Text>
<Text style={{fontFamily: "Kanit"}}>{formatDate(rating.date)}</Text>
</View>
{rating.comment && (
<Text style={styles.reviewComment}>
{rating.comment}
</Text>
)}



{rating.photos?.length > 0 && (
      <View style={styles.reviewPhotos}>
        {rating.photos.map((photo: any, index: number) => (
          <Pressable
            key={index}
            onPress={() => openImageModal(rating.photos, index)}
          >
            <Image
              source={{ uri: photo.url }}
              style={styles.reviewPhoto}
            />
          </Pressable>
        ))}
      </View>
    )}
</View>
))}

</View>
)}

    </Animated.ScrollView>
    <Modal
  visible={isModalVisible}
  transparent
  animationType="fade"
  onRequestClose={closeImageModal}
>
  <Pressable style={styles.modalOverlay} onPress={closeImageModal}>
    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
      {selectedImageIndex !== null &&
 reviewImagesModal[selectedImageIndex] && (
  <>
    <Animated.Image
  {...panResponder.panHandlers}
  source={{ uri: reviewImagesModal[selectedImageIndex].url }}
  style={[
    styles.modalImage,
    {
      transform: [{ translateX }],
    },
  ]}
/>

    {reviewImagesModal.length > 1 && (
      <View style={styles.modalNav}>
        <Pressable style={styles.navButton} onPress={showPreviousImage}>
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>

        <Text style={styles.imageCounter}>
          {selectedImageIndex + 1} / {reviewImagesModal.length}
        </Text>

        <Pressable style={styles.navButton} onPress={showNextImage}>
          <Text style={styles.navButtonText}>›</Text>
        </Pressable>
      </View>
    )}
  </>
)}
    </Pressable>
  </Pressable>
</Modal>

<Modal
  visible={messageModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setMessageModalVisible(false)}
>
  <View style={styles.messageOverlay}>
    <View style={styles.messageModal}>
      <Text style={styles.messageTitle}>
        Contacter {user.name}
      </Text>

      <Text style={styles.messageLabel}>
        Cette conversation concerne :
      </Text>

      <Pressable
        style={[
          styles.requestOption,
          selectedRequestId === null && styles.requestOptionSelected,
        ]}
        onPress={() => setSelectedRequestId(null)}
      >
        <Text style={styles.requestOptionText}>
          Sans demande particulière
        </Text>
        {selectedRequestId === null && <Text>✓</Text>}
      </Pressable>

      {clientRequests.map((request) => (
        <Pressable
          key={request._id}
          style={[
            styles.requestOption,
            selectedRequestId === request._id &&
              styles.requestOptionSelected,
          ]}
          onPress={() => setSelectedRequestId(request._id)}
        >
          <Text style={styles.requestOptionText}>
            {request.title}
          </Text>
          {selectedRequestId === request._id && <Text>✓</Text>}
        </Pressable>
      ))}

      <Text style={styles.messageLabel}>
        Votre premier message :
      </Text>

      <TextInput
        style={styles.messageInput}
        placeholder="Bonjour, je souhaiterais vous contacter..."
        value={firstMessage}
        onChangeText={setFirstMessage}
        multiline
        textAlignVertical="top"
        blurOnSubmit={true}
  returnKeyType="done"
  onSubmitEditing={() => Keyboard.dismiss()}
      />

      <Pressable
        style={[
          styles.sendButton,
          (!firstMessage.trim() || sendingMessage) && { opacity: 0.5 },
        ]}
        onPress={sendFirstMessage}
        disabled={!firstMessage.trim() || sendingMessage}
      >
        <Text style={styles.sendButtonText}>
          {sendingMessage ? "Envoi..." : "Envoyer"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setMessageModalVisible(false)}
        style={styles.cancelButton}
      >
        <Text style={styles.cancelButtonText}>Annuler</Text>
      </Pressable>
    </View>
  </View>
</Modal>

    </ImageBackground>
  );
}

const styles = StyleSheet.create({

  container: {
    paddingTop: 20,
    paddingInline: 10,
paddingBottom: 60  },

avatarPressable: {
  position: "absolute",
  zIndex: 99,
  left: 0,
},

  avatar: {
    width: 100,
    height: 110,
    borderRadius: 25,
    borderWidth: 2,
     borderColor: "#fcfcfc"
  },

  name: {
    fontSize: 22,
    fontFamily: "Londrinak",
    textShadowColor: "white",
    textShadowRadius: 3,
    textShadowOffset: {width: 0, height: 1}
  },

  rating: {
    fontSize: 16,
    fontFamily: "Montt",
    padding: 1
  },

  location: {
    color: "#000000",
    fontFamily: "Mont",
    padding: 1
  },

  section: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#c5c5c5"
  },

  title: {
    fontSize: 18,
    fontFamily: "Montt",
    marginBottom: 10
  },

  text: {
    fontSize: 16,
    color: "#4e4e4e",
    fontFamily: "Londrina"
  },

  

  equipment: {

paddingHorizontal:14,
paddingVertical:10,

borderRadius:30,
borderWidth: 1,
    borderColor: "#8dbfad",

margin:2
  },
  equipmentText: {
    fontSize: 12,
    fontFamily: "Montmed",
    color:"#353535",
    
  },
  skillsContainer: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 14,
  alignItems: "center",
  justifyContent: "center"
},

skill: {
  width: "30%",
  minHeight: 105,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 14,
  paddingHorizontal: 8,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#B9E8D7",
  shadowColor: "#1A5B4F",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 2,
},

skillIconContainer: {
  width: 43,
  height: 43,
  borderRadius: 14,
  backgroundColor: "#FFFFFF",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 9,
},

skillIcon: {
  width: 23,
  height: 23,
  resizeMode: "contain",
},

skillText: {
  fontFamily: "Montmed",
  color: "#1A5B4F",
  fontSize: 12,
  textAlign: "center",
},

  

  portfolio: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    backgroundColor: "#1a5b4f",
    gap: 8,
    padding: 12,
    borderRadius: 20
  },

  portfolioImage: {
    width: 110,
    height: 110,
    borderRadius: 12,
    borderColor: "#f3f3f3",
    borderWidth: 2
  },
  badges:{
flexDirection:"column",
alignSelf: "flex-end",
gap: 4,
marginBottom: 10

},

badge:{
backgroundColor:"#cfe817",

borderRadius:18,

paddingInline: 8,
   paddingBlock: 5,
   alignItems: "center",
   justifyContent: "center",
   borderColor: "#ffffff3e",
   borderWidth: 1
},

badgeText:{
fontSize:10,
fontFamily: "Montt",
padding: 1
},
review:{
marginBlock:16,
paddingBottom:14,
borderBottomWidth:1,
borderColor:"#e1e1e1",
flexDirection: "column",
justifyContent: "space-between",
alignItems: "baseline",
width: "100%"
},

reviewStars:{
fontSize:16
},

reviewComment:{
color:"#353535",
marginTop:4,
fontFamily: "Londrinak",
fontSize: 16,
},
reviewPhotos: {
  flexDirection: "row",
  gap: 6,
  alignItems: "center",
  justifyContent: "center",
},

reviewPhoto: {
  width: 70,
  height: 70,
  borderRadius: 8
},
map:{
height:200,
borderRadius:20,
marginTop:10,
borderWidth: 1,
borderColor: "#1a5b4f",
overflow: "hidden"
},

locationText:{
marginTop:8,
color:"#666",
fontFamily: "Mont"
},
modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.65)",
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 20,
},

modalContent: {
  width: "100%",
  maxWidth: 420,
  alignItems: "center",
  justifyContent: "center",
},

modalImage: {
  width: "100%",
  height: 520,
  borderRadius: 18,
  backgroundColor: "#fff",
borderColor: "#fff",
  borderWidth: 1},

modalNav: {
  marginTop: 14,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 18,
},

navButton: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "#1a5b4f",
  alignItems: "center",
  justifyContent: "center",
  borderColor: "#fff",
  borderWidth: 1
},

navButtonText: {
  color: "#fff",
  fontSize: 26,
},

imageCounter: {
  color: "#fff",
  fontSize: 16,
  fontFamily: "Mont",
},
badgeLoc: {
  borderRadius: 18,
   backgroundColor: "#ffffff52",
   paddingInline: 8,
   paddingBlock: 5,
   alignItems: "center",
   justifyContent: "center",
   borderColor: "#ffffff3e",
   borderWidth: 1,
       flexDirection: "row",
       gap: 4

},
 badgeLocationText: {
    color: "#000000",
    fontFamily: "Montmed",
    padding: 1,
    fontSize: 10,
  },

  messageButton: {
  backgroundColor: "#007AFF",
  padding: 12,
  borderRadius: 20,
  alignItems: "center",
  marginHorizontal: 40,
  marginVertical: 15,
},

messageButtonText: {
  color: "#fff",
  fontFamily: "Montt",
  fontSize: 14,
},

messageOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "center",
  padding: 20,
},

messageModal: {
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 20,
  maxHeight: "85%",
},

messageTitle: {
  fontFamily: "Montt",
  fontSize: 21,
  color: "#1a5b4f",
  marginBottom: 20,
},

messageLabel: {
  fontFamily: "Montmed",
  fontSize: 14,
  marginTop: 10,
  marginBottom: 8,
},

requestOption: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 12,
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 10,
  marginBottom: 7,
},

requestOptionSelected: {
  borderColor: "#1a5b4f",
  backgroundColor: "#e8f5f0",
},

requestOptionText: {
  fontFamily: "Mont",
  fontSize: 13,
  flex: 1,
},

messageInput: {
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 12,
  padding: 12,
  minHeight: 110,
  fontFamily: "Mont",
  fontSize: 14,
  marginBottom: 15,
},

sendButton: {
  backgroundColor: "#007AFF",
  borderRadius: 12,
  padding: 14,
  alignItems: "center",
},

sendButtonText: {
  color: "#fff",
  fontFamily: "Montt",
  fontSize: 16,
},

cancelButton: {
  padding: 12,
  alignItems: "center",
},

cancelButtonText: {
  color: "#666",
  fontFamily: "Mont",
},
});