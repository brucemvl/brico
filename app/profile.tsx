import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useApi } from "../services/api";

const defaultAvatar =
  "https://res.cloudinary.com/ton-cloud-name/image/upload/v123456/default-profile.png";

export default function Profile() {
  const { apiFetch } = useApi();
  const params = useLocalSearchParams();
  const userId = params.id as string;

  const [user, setUser] = useState<any>(null);

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

  const [coords, setCoords] = useState<{
  latitude: number;
  longitude: number;
} | null>(null);

useEffect(() => {
  const geocode = async () => {
  if (!user?.location) return;

  try {
    const cleanLocation = user.location
      .replace(/\(\d+\)/, "") // enlève (75)
      .trim();

    const query = `${cleanLocation}, France`;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    );

    const data = await res.json();

    if (data.length > 0) {
      setCoords({
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      });
    }
  } catch (err) {
    console.log("Erreur géocodage", err);
  }
};

  geocode();
}, [user]);

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
<View>
  <Animated.Text style={{ fontFamily: "Montt", opacity: headerOpacity, marginTop: 50, marginLeft: 10 }}>Profil de {user?.name}</Animated.Text>
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
            {user.portfolio.map((img: any) => (
              <Image
                key={img._id}
                source={{ uri: img.url }}
                style={styles.portfolioImage}
              />
            ))}
          </View>
        </View>
      )}

      {coords && (
<View style={styles.section}>
<Text style={styles.title}>Localisation</Text>

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

<Text style={styles.locationText}>
📍 {user.location}
</Text>

</View>
)}

      {user.ratings?.length > 0 && (
<View style={styles.section}>
<Text style={styles.title}>Avis clients</Text>

{user.ratings.map((rating:any)=>(
<View key={rating._id} style={styles.review}>

<Text style={styles.reviewStars}>
{"⭐".repeat(rating.score)}
</Text>

{rating.comment && (
<Text style={styles.reviewComment}>
{rating.comment}
</Text>
)}

</View>
))}

</View>
)}

    </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    backgroundColor: "#f3f3f3",
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
    borderWidth: 2, borderColor: "#F3F3F3"
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
    borderColor: "#d0d0d0"
  },

  title: {
    fontSize: 18,
    fontFamily: "Montt",
    marginBottom: 10
  },

  text: {
    fontSize: 16,
    color: "#444",
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
    justifyContent: "center"
  },

  portfolioImage: {
    width: 110,
    height: 110,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10
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
marginBottom:12,
paddingBottom:10,
borderBottomWidth:1,
borderColor:"#eee"
},

reviewStars:{
fontSize:16
},

reviewComment:{
color:"#444",
marginTop:4
},
map:{
height:200,
borderRadius:10,
marginTop:10
},

locationText:{
marginTop:8,
color:"#666",
fontFamily: "Mont"
}
});