import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Image,
    ScrollView,
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

  const [coords, setCoords] = useState<{
  latitude: number;
  longitude: number;
} | null>(null);

useEffect(() => {
  const geocode = async () => {
    if (!user?.location) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(user.location)}`
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

  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={{
            uri: user.profileImage?.url || defaultAvatar
          }}
          style={styles.avatar}
        />

        <Text style={styles.name}>{user.name}</Text>

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
            ⭐ {user.averageRating.toFixed(1)} / 5
          </Text>
        )}

        {user.location && (
          <Text style={styles.location}>📍 {user.location}</Text>
        )}
      </View>

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
      {user.equipment && (
        <View style={styles.section}>
          <Text style={styles.title}>Équipement</Text>
          <Text style={styles.text}>{user.equipment}</Text>
        </View>
      )}

      {/* PORTFOLIO */}
      {user.portfolio?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.title}>Portfolio</Text>

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

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#fff"
  },

  header: {
    alignItems: "center",
    padding: 20
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10
  },

  name: {
    fontSize: 22,
    fontWeight: "bold"
  },

  rating: {
    marginTop: 5,
    fontSize: 16
  },

  location: {
    color: "#777",
    marginTop: 3
  },

  section: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#eee"
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10
  },

  text: {
    fontSize: 15,
    color: "#444"
  },

  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap"
  },

  skill: {
    backgroundColor: "#eee",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8
  },

  skillText: {
    fontSize: 13
  },

  portfolio: {
    flexDirection: "row",
    flexWrap: "wrap"
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
marginTop:10
},

badge:{
backgroundColor:"#eef6ff",
paddingHorizontal:10,
paddingVertical:5,
borderRadius:8,
marginRight:6
},

badgeText:{
fontSize:12,
fontWeight:"600"
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
color:"#666"
}
});