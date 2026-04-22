import BackButton from '@/components/BackButton';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import logo from "../assets/briconnect33.png";
import fond from "../assets/convert_1.png";


import { useApi } from "../services/api";

type City = {
  code: string;
  nom: string;
  departement: {
    code: string;
  };
};

export default function ProfileClient() {

  const { apiFetch } = useApi();
  const router = useRouter();

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [phone,setPhone] = useState("");
  const [location,setLocation] = useState("");
  const [description,setDescription] = useState("");
  const [profileImage,setProfileImage] = useState<any>(null);

  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);

  const [locationQuery, setLocationQuery] = useState("");
const [cities, setCities] = useState<City[]>([]);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const scrollY = new Animated.Value(0);
    const [showCityOverlay, setShowCityOverlay] = useState(false);
      
        const headerOpacity = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 1],
        extrapolate: "clamp",
      });
      
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

  const fetchProfile = async () => {

    try{

      const data = await apiFetch("/users/me");

      setName(data.name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setLocation(data.location || "");
      setDescription(data.description || "");
      setProfileImage(data.profileImage || null);

    }catch{
      Alert.alert("Erreur","Impossible de charger le profil");
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{
    fetchProfile();
  },[]);

  const pickImage = async () => {

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if(!permission.granted){
      return Alert.alert("Permission refusée");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing:true,
      aspect:[1,1],
      quality:0.7
    });

    if(!result.canceled){
      setProfileImage({uri: result.assets[0].uri});
    }
  };

  //SUPPRIMER LA PHOTO DE PROFIL
    const handleDeleteProfileImage = async () => {
    Alert.alert(
      "Supprimer la photo",
      "Voulez-vous supprimer votre photo de profil ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch("/users/profile/client/profile-image", {
                method: "DELETE",
              });
  
              setProfileImage(null);
            } catch {
              Alert.alert("Erreur", "Impossible de supprimer la photo");
            }
          },
        },
      ]
    );
  };

  const IDF_DEPARTMENTS = ["75", "92", "93", "94", "77", "78", "91", "95"];

  const PARIS_ARRONDISSEMENTS = [
  "Paris 1er",
  "Paris 2e",
  "Paris 3e",
  "Paris 4e",
  "Paris 5e",
  "Paris 6e",
  "Paris 7e",
  "Paris 8e",
  "Paris 9e",
  "Paris 10e",
  "Paris 11e",
  "Paris 12e",
  "Paris 13e",
  "Paris 14e",
  "Paris 15e",
  "Paris 16e",
  "Paris 17e",
  "Paris 18e",
  "Paris 19e",
  "Paris 20e",
];

  const searchCities = async (text) => {
  setLocationQuery(text);


  if (text.length < 2) {
  setCities([]);
  setShowCityOverlay(false);
  return;
}

  if (text.toLowerCase().includes("paris")) {
    setCities(
      PARIS_ARRONDISSEMENTS.map((a, i) => ({
        code: `paris-${i + 1}`,
        nom: a,
        departement: { code: "75" },
      }))
    );
    return; // 🔥 stop API ici
  }

  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${text}&fields=departement,code,centre&limit=20`
    );

    const data = await res.json();

    const sorted = data.sort((a, b) => {
      const aIsIDF = IDF_DEPARTMENTS.includes(a.departement.code);
      const bIsIDF = IDF_DEPARTMENTS.includes(b.departement.code);

      if (aIsIDF && !bIsIDF) return -1;
      if (!aIsIDF && bIsIDF) return 1;

      

      // ensuite priorité 92
      if (a.departement.code === "92") return -1;
      if (b.departement.code === "92") return 1;

      return 0;
    });

   

    setCities(sorted);
    setShowCityOverlay(true);

  } catch (err) {
    console.log("Erreur villes:", err);
  }
};

  const handleSave = async () => {

    try{

      setSaving(true);

      const formData = new FormData();

      formData.append("name",name);
      formData.append("phone",phone);
      formData.append("location",location);
      formData.append("description",description);

      if(profileImage?.uri){

        const manipulated = await ImageManipulator.manipulateAsync(
          profileImage.uri,
          [],
          {compress:0.7, format:ImageManipulator.SaveFormat.JPEG}
        );

        formData.append("profileImage",{
          uri: manipulated.uri,
          name:"profile.jpg",
          type:"image/jpeg"
        } as any);
      }

      await apiFetch("/users/profile/client",{
        method:"PUT",
        body:formData
      });

      Alert.alert("Succès","Profil mis à jour");

      router.replace("/homeClient");

    }catch(err:any){
      Alert.alert("Erreur",err.message || "Erreur sauvegarde");
    }finally{
      setSaving(false);
    }
  };

  if(loading) return <ActivityIndicator size="large"/>;

  return(

<ImageBackground source={fond} style={{ flex: 1 }} >
      <KeyboardAvoidingView
        style={{ paddingBottom: 40 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
         // ajuste selon ton header
      >
<Animated.View style={{ opacity: headerOpacity, flexDirection: "row", alignItems: "center", position: "relative", top: 30, paddingBottom: 15 }}>
                <Image source={logo} style={{ height: 60, width: 60 }} />
                <Text style={{ fontFamily: "Montt", fontSize: 16}}>Modifier mon profil</Text>
              
</Animated.View><BackButton />
<Animated.ScrollView
  contentContainerStyle={styles.container}
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  )}
  scrollEventThrottle={6}
  keyboardShouldPersistTaps="handled"
> 
<Text style={styles.title}>Mon Profil</Text>
<View style={{alignItems: "center", gap: 10, backgroundColor: "#d8d8d8", padding: 15, borderRadius: 20, width: "100%"}}>

<Text style={{fontFamily: "Mont"}}>Photo</Text>

{profileImage && (
<Image
source={{uri: profileImage.url || profileImage.uri}}
style={styles.profileImage}
/>
)}

<View style={{flexDirection: "row", gap: 20}}>
      <TouchableOpacity style={styles.addProfileButton} onPress={pickImage} >
        <Text style={{ color: "white", fontFamily: "Mont" }}>Choisir une photo</Text>
        </TouchableOpacity>
      <TouchableOpacity
      style={styles.deleteProfileButton}
      onPress={handleDeleteProfileImage}
    >
      <Text style={{ color: "white", fontFamily: "Mont" }}>Supprimer</Text>
    </TouchableOpacity>
    </View>
</View>

<View style={styles.box}>
      <Text style={{fontFamily: "Mont", color: "#ffffff"}}>Nom</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
</View>

<View style={styles.box}>
      <Text style={{fontFamily: "Mont", color: "#ffffff"}}>Téléphone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="numeric" maxLength={10} />
</View>

<View style={[styles.box, { paddingBottom: 20 }]}>
  <Text style={{ fontFamily: "Mont", color: "#ffffff", marginBottom: 10 }}>
    Localisation
  </Text>

  <TextInput
    value={locationQuery}
    onChangeText={searchCities}
    placeholder="Tapez une ville..."
    style={{
      width: 320,
      fontFamily: "Londrina",
      backgroundColor: "#fff",
      padding: 10,
      borderRadius: 8,
    }}
    accessible
    accessibilityLabel="Rechercher une ville"
    accessibilityHint="Tapez pour afficher les suggestions"
    autoCorrect={false}
    autoCapitalize="words"
  />
</View>



<View style={{marginTop:20}}>

{saving
? <ActivityIndicator/>
: <TouchableWithoutFeedback
              accessible
            accessibilityRole="button"
            accessibilityLabel="Enregistrer"
            accessibilityHint={`Enregistrer les infos`}
            onPress={handleSave}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
              >
                <Animated.View style={[styles.saveButton, { transform: [{ scale: scaleAnim }] }]}>
  <Text style={styles.saveText}>Enregistrer</Text>
  </Animated.View>
</TouchableWithoutFeedback>
}

</View>

</Animated.ScrollView>
    </KeyboardAvoidingView>
    {showCityOverlay && cities.length > 0 && (
  <TouchableWithoutFeedback onPress={() => setShowCityOverlay(false)}>
    <View style={styles.overlay}>
      
      <TouchableWithoutFeedback>
        <View style={styles.overlayBox}>
          
          <Text style={styles.overlayTitle}>
            Sélectionner une ville
          </Text>

          <Animated.FlatList
            data={cities}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            style={{ width: "100%" }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  const selected = `${item.nom} (${item.departement.code})`;
                  setLocation(selected);
                  setLocationQuery(selected);
                  setCities([]);
                  setShowCityOverlay(false);
                }}
                style={styles.cityItem}
              >
                <Text style={styles.cityText}>
                  {item.nom} ({item.departement.code})
                </Text>
              </TouchableOpacity>
            )}
          />

        </View>
      </TouchableWithoutFeedback>

    </View>
  </TouchableWithoutFeedback>
)}
    </ImageBackground>
      );
}

const styles = StyleSheet.create({

container:{
alignItems:"center",
paddingTop:40,
paddingHorizontal:30,
paddingBottom:80,
gap: 15
},

title:{
fontSize:22,
fontFamily:"Montt",
},

input: {
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    marginTop: 10,
    width: "100%",
    backgroundColor: "#ffffff",
    
    fontFamily: "Londrina",
    fontSize: 15
  },
box: {
backgroundColor: "#247868",
width: "100%",
alignItems: "center",
justifyContent: "center",
padding: 8,
borderRadius: 20
  },

profileImage:{
width:90,
height:90,
borderRadius:45,
marginBottom:10
},
 deleteProfileButton: {
  
  backgroundColor: "#c03939",
  padding: 10,
  borderRadius: 20,
},
addProfileButton: {
  
  backgroundColor: "#72ca66",
  padding: 10,
  borderRadius: 20,

},
saveButton: {
  backgroundColor: "#007AFF",
  width: "100%",
  padding: 15,
  borderRadius: 25,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#0061ca"
},

saveText: {
  color: "white",
  fontFamily: "Montt",
  fontSize: 16,
},
overlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
},

overlayBox: {
  width: "90%",
  maxHeight: "70%",
  backgroundColor: "white",
  borderRadius: 15,
  padding: 15,
},

overlayTitle: {
  fontSize: 16,
  fontFamily: "Montt",
  marginBottom: 10,
},

cityItem: {
  padding: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#eee",
},

cityText: {
  fontFamily: "Londrina",
},

});