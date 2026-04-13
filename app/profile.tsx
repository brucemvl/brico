import BackButton from "@/components/BackButton";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import logo from "../assets/briconnect33.png";
import fond from "../assets/convert_1.png";
import { useApi } from "../services/api";



const defaultAvatar =
  "https://res.cloudinary.com/dwjssp2pd/image/upload/v1773074497/default_pro.jpg";

export default function Profile() {
  const { apiFetch } = useApi();
  const params = useLocalSearchParams();
  const userId = params.id as string;

  const [user, setUser] = useState<any>(null);

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

const isModalVisible = selectedImageIndex !== null;

const openImageModal = (index: number) => {
  setSelectedImageIndex(index);
};

const closeImageModal = () => {
  setSelectedImageIndex(null);
};

const showPreviousImage = () => {
  if (!user?.portfolio?.length || selectedImageIndex === null) return;

  setSelectedImageIndex((prev) => {
    if (prev === null) return null;
    return prev === 0 ? user.portfolio.length - 1 : prev - 1;
  });
};

const showNextImage = () => {
  if (!user?.portfolio?.length || selectedImageIndex === null) return;

  setSelectedImageIndex((prev) => {
    if (prev === null) return null;
    return prev === user.portfolio.length - 1 ? 0 : prev + 1;
  });
};

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

  const [coords, setCoords] = useState<{
  latitude: number;
  longitude: number;
} | null>(null);

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

  if (!user) return <Text>Chargement...</Text>;

  const parsedEquipment =
  typeof user.equipment === "string"
    ? JSON.parse(user.equipment)
    : user.equipment;

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
          <Image
          source={{
            uri: user.profileImage?.url || defaultAvatar
          }}
          style={styles.avatar}
        />
              <LinearGradient colors={["#1a5b4f", "#30a590"]} style={{width: "85%", alignItems: "center", paddingInline: 20, paddingTop: 54, paddingBottom: 24, borderRadius: 20, gap: 4, left: 25}}>
        
<View style={{alignItems: "center"}}>
        <Text style={styles.name}>{user.name}</Text>

         {user.location && (
          <Text style={styles.location}>📍 {user.location}</Text>
        )}

        </View>

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
</View>

        {user.averageRating > 0 && (
          <Text style={styles.rating}>
            ⭐ {formatRating(user?.averageRating)}/5
          </Text>
        )}
</LinearGradient>
       
      </Animated.View>

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
          <Text style={styles.title}>Compétences</Text>

          <View style={styles.skillsContainer}>
            {user.skills.map((skill: string, i: number) => (
              <View key={i} style={styles.skill}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ÉQUIPEMENT */}
      {user.equipment?.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.title}>Équipement</Text>

    <View style={styles.skillsContainer}>
      {parsedEquipment?.map((item: string, i: number) => (
        <View key={i} style={styles.skill}>
          <Text style={styles.skillText}>{item}</Text>
        </View>
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
  <Pressable key={img._id} onPress={() => openImageModal(index)}>
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
<View>
<Text style={styles.reviewStars}>
{"⭐".repeat(rating.score)}
</Text>

{rating.comment && (
<Text style={styles.reviewComment}>
{rating.comment}
</Text>
)}
</View>
<View>
  <Text>{rating?.userName}</Text>
<Text style={{fontFamily: "Kanit"}}>{formatDate(rating.date)}</Text>
</View>
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
      {selectedImageIndex !== null && user?.portfolio?.[selectedImageIndex] && (
        <>
          <Image
            source={{ uri: user.portfolio[selectedImageIndex].url }}
            style={styles.modalImage}
          />

          {user.portfolio.length > 1 && (
            <View style={styles.modalNav}>
              <Pressable style={styles.navButton} onPress={showPreviousImage}>
                <Text style={styles.navButtonText}>‹</Text>
              </Pressable>

              <Text style={styles.imageCounter}>
                {selectedImageIndex + 1} / {user.portfolio.length}
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({

  container: {
    paddingTop: 20,
    paddingInline: 10,
paddingBottom: 60  },

  avatar: {
    width: 100,
    height: 110,
    borderRadius: 25,
    position: "absolute",
    zIndex: 99,
    left: 0,
    borderWidth: 2,
     borderColor: "#fcfcfc"
  },

  name: {
    fontSize: 22,
    fontFamily: "Londrinak"
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
    color: "#353535",
    fontFamily: "Londrina"
  },

  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center"
  },

  skill: {
    backgroundColor: "#1a5b4f",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8
  },

  skillText: {
    fontSize: 13,
    fontFamily: "Mont",
    color: "#fff"
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
flexDirection:"row",
marginTop:10,
position:"absolute",
right: 5,
top: 1
},

badge:{
backgroundColor:"#cfe817",
paddingHorizontal:10,
paddingVertical:5,
borderRadius:8,
marginRight:6
},

badgeText:{
fontSize:11,
fontFamily: "Montt",
padding: 1
},
review:{
marginBlock:12,
paddingBottom:10,
borderBottomWidth:1,
borderColor:"#e1e1e1",
flexDirection: "row",
justifyContent: "space-between",
alignItems: "baseline"
},

reviewStars:{
fontSize:16
},

reviewComment:{
color:"#353535",
marginTop:4,
fontFamily: "Londrinak",
fontSize: 15
},
map:{
height:200,
borderRadius:10,
marginTop:10,
borderWidth: 2,
borderColor: "#1a5b4f"
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
  height: 420,
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
  fontSize: 14,
  fontFamily: "Mont",
}
});