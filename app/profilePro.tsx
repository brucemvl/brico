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
import trash from "../assets/icons/trash2.png";
import { useApi } from "../services/api";


type City = {
  code: string;
  nom: string;
  departement: {
    code: string;
  };
};



const categories = ["Plomberie", "Electricité", "Peinture", "Agencement", "Carrelage", "Divers"];

const equipmentOptions = [
  "Caisse à outils",
  "Perceuse",
  "Vis / Chevilles",
  "Ponceuse",
  "Multimètre",
  "Escabeau",
  "Pinceaux",
  "Rouleaux",
  "Camion",
  "Laser",
  "Bache de protection",
  "Scie sauteuse",
   "Scie circulaire",
   "Coupe carrelage"
];

export default function ProfilePro() {
  const { apiFetch } = useApi();
  const router = useRouter();

  const scrollY = new Animated.Value(0);

  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  
    const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [siret, setSiret] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
const [equipment, setEquipment] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
      const [showCityOverlay, setShowCityOverlay] = useState(false);
  

  const [locationQuery, setLocationQuery] = useState("");
const [cities, setCities] = useState<City[]>([]);

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

  const containsForbiddenInfo = (text: string) => {
  const phoneRegex = /(\+?\d[\d\s.-]{7,})/;
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

  return phoneRegex.test(text) || emailRegex.test(text);
};

  // 🔹 Fetch profil
  const fetchProfile = async () => {
    try {
      const data = await apiFetch("/users/me");
      setName(data.name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setSiret(data.siret || "");
      setLocation(data.location || "");
      setDescription(data.description || "");
setEquipment(Array.isArray(data.equipment) ? data.equipment : []);
setSkills(Array.isArray(data.skills) ? data.skills : []);
      setProfileImage(data.profileImage || null);
      setPortfolio(data.portfolio || []);
    } catch {
      Alert.alert("Erreur", "Impossible de récupérer le profil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // 🔹 Image Picker Profile
  const handlePickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert("Permission refusée");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setProfileImage({ uri: result.assets[0].uri });
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
            await apiFetch("/users/profile/pro/profile-image", {
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

  // 🔹 Image Picker Portfolio
  const handlePickPortfolioImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert("Permission refusée");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => ({
        uri: asset.uri,
        isNew: true,
      }));
      setPortfolio((prev) => [...prev, ...newImages]);
    }
  };

  // 🔹 Animation suppression
 const removePortfolioImage = async (img: any, index: number) => {
  setDeletingIndex(index); // 👈 active le loader

  try {
    if (img._id) {
      await apiFetch(`/users/profile/pro/portfolio/${img._id}`, {
        method: "DELETE",
      });
    }

    setPortfolio((prev) => prev.filter((_, i) => i !== index));
  } catch (e) {
    Alert.alert("Erreur", "Impossible de supprimer l'image");
  } finally {
    setDeletingIndex(null); // 👈 reset
  }
};

  const toggleEquipment = (item: string) => {
  if (equipment.includes(item)) {
    setEquipment(equipment.filter((e) => e !== item));
  } else {
    setEquipment([...equipment, item]);
  }
};

  const toggleSkill = (skill: string) => {
    if (skills.includes(skill))
      setSkills(skills.filter((s) => s !== skill));
    else setSkills([...skills, skill]);
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

  // 🔹 Save profil
  const handleSave = async () => {
    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("phone", phone);
      formData.append("siret", siret);
      formData.append("location", location);
      formData.append("description", description);
      formData.append("equipment", JSON.stringify(equipment));
      formData.append("skills", JSON.stringify(skills));

      // Profile image
      if (profileImage?.uri) {
        const manipulated = await ImageManipulator.manipulateAsync(
          profileImage.uri,
          [],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        formData.append("profileImage", {
          uri: manipulated.uri,
          name: "profile.jpg",
          type: "image/jpeg",
        } as any);
      }

      // Portfolio
      for (let i = 0; i < portfolio.length; i++) {
        const img = portfolio[i];
        if (!img.uri || !img.isNew) continue;

        setUploadingIndex(i);

        const manipulated = await ImageManipulator.manipulateAsync(
          img.uri,
          [],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        formData.append("portfolio", {
          uri: manipulated.uri,
          name: `portfolio_${i}.jpg`,
          type: "image/jpeg",
        } as any);
      }

      setUploadingIndex(null);

      if (containsForbiddenInfo(description)) {
  Alert.alert(
    "Contenu interdit",
    "Veuillez ne pas inclure de numéro de téléphone ou d'email dans la description."
  );
  return;
}

      await apiFetch("/users/profile/pro", {
        method: "PUT",
        body: formData,
      });

      Alert.alert("Succès", "Profil mis à jour !");
      router.replace("/homePro");
    } catch (err: any) {
Alert.alert(
  "Erreur",
  err?.error || err.message || "Erreur sauvegarde"
);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <ImageBackground source={fond} style={{ flex: 1 }} >
      <KeyboardAvoidingView
        style={{ paddingBottom: 40 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
         // ajuste selon ton header
      >
<Animated.View style={{opacity: headerOpacity,  flexDirection: "row", alignItems: "center", position: "relative", top: 30, paddingBottom: 15 }}>
    <Image source={logo} style={{height: 60, width: 60}}/>
    <Text style={{ fontFamily: "Montt" , fontSize: 16}}>Modifier mon profil</Text></Animated.View>
    <BackButton />
<Animated.ScrollView
  contentContainerStyle={styles.container}
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  )}
  scrollEventThrottle={6}
> 

<View 
style={{alignItems: "center", gap: 10, backgroundColor: "#d8d8d8", padding: 15, borderRadius: 20, width: "100%"}}
accessible
  accessibilityLabel="Photo de profil" >
      <Text style={{fontFamily: "Mont", color: "#000000"}}>Photo de profil</Text>
      {profileImage && (
    <Image
      source={{ uri: profileImage.url || profileImage.uri }}
      style={styles.profileImage}
      accessible
  accessibilityLabel="Photo de profil actuelle"
    />
)}
<View style={{flexDirection: "row", gap: 20}}>
      <TouchableOpacity 
      style={styles.addProfileButton} 
      onPress={handlePickProfileImage}
      accessible
  accessibilityRole="button"
  accessibilityLabel="Choisir une photo de profil"
  accessibilityHint="Ouvrir la galerie pour sélectionner une image" >
        <Text style={{ color: "white", fontFamily: "Mont" }}>Choisir une photo</Text>
        </TouchableOpacity>
      <TouchableOpacity
      style={styles.deleteProfileButton}
      onPress={handleDeleteProfileImage}
      accessible
  accessibilityRole="button"
  accessibilityLabel="Supprimer la photo de profil"
  accessibilityHint="Retirer la photo actuelle"
    >
      <Text style={{ color: "white", fontFamily: "Mont" }}>Supprimer</Text>
    </TouchableOpacity>
    </View>
    </View>

<View style={styles.box}>
      <Text style={{fontFamily: "Mont", color: "#ffffff"}}>Nom</Text>
      <TextInput 
      style={styles.input} 
      value={name} 
      onChangeText={setName}
      accessible
  accessibilityLabel="Nom"
  accessibilityHint="Modifier votre nom" />
</View>

<View style={styles.box}>
      <Text style={{fontFamily: "Mont", color: "#ffffff"}}>Téléphone</Text>
      <TextInput 
      style={styles.input} 
      value={phone} 
      onChangeText={setPhone} 
      keyboardType="numeric" 
      maxLength={10} 
      accessible
  accessibilityLabel="Numéro de téléphone"
  accessibilityHint="Saisir votre numéro de téléphone" />
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

<View style={styles.box}>
      <Text style={{fontFamily: "Mont", color: "#ffffff"}}>SIRET</Text>
      <TextInput style={styles.input} value={siret} onChangeText={setSiret} keyboardType="numeric" maxLength={14} accessible accessibilityLabel="Numéro SIRET" accessibilityHint="Saisir votre numéro professionnel" />
      {siret.length === 14 && (
        <View style={styles.badge}><Text style={styles.badgeText}>✔ Badge PRO activé</Text></View>
      )}
      </View>

<View style={styles.box}>
      <Text style={{fontFamily: "Mont", color: "#ffffff"}}>Description</Text>
      <TextInput 
      style={[styles.input, { height: 100 }]} 
      value={description} 
      onChangeText={setDescription} 
      multiline 
      accessible
  accessibilityLabel="Description"
  accessibilityHint="Décrire votre activité" />
</View>

<View style={styles.box}>
      <Text style={{ marginBottom: 15, fontFamily: "Mont", color: "#ffffff" }}>Compétences</Text>
      <View style={styles.skillsContainer} accessible accessibilityLabel="Sélection des compétences">
        {categories.map((cat) => (
          <TouchableOpacity key={cat} style={[styles.skillButton, skills.includes(cat) && styles.skillSelected]} onPress={() => toggleSkill(cat)}>
            <Text style={{fontFamily: "Montt", color: skills.includes(cat) ?  "black" : "#ccc" }}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      </View>

      <View style={styles.box}>
      <Text style={{marginBottom: 15, fontFamily: "Mont", color: "#ffffff"}}>Matériel</Text>
<View style={styles.skillsContainer}>
    {equipmentOptions.map((item) => (
      <TouchableOpacity
        key={item}
        style={[
          styles.skillButton,
          equipment.includes(item) && styles.equipmentSelected,
        ]}
        onPress={() => toggleEquipment(item)}
      >
        <Text
          style={{
            fontFamily: "Montt",
            color: equipment.includes(item) ? "black" : "#ccc",
          }}
        >
          {item}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
  </View>


<View style={styles.box}>
      <Text style={{ marginBottom: 15, fontFamily: "Mont", color: "#ffffff" }}>Mes réalisations</Text>

      <View style={styles.portfolioContainer}>
        {portfolio.map((img, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image
              source={{ uri: img.url || img.uri }}
              style={styles.portfolioImage}
            />

            {uploadingIndex === index && (
              <View style={styles.loaderOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}

            
            <View style={styles.deleteButton}>
  {deletingIndex === index ? (
    <ActivityIndicator size="small" color="red" />
  ) : (
    <TouchableOpacity onPress={() => removePortfolioImage(img, index)}>
      <Image source={trash} style={{ height: 18, width: 18 }} />
    </TouchableOpacity>
  )}
</View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.addProfileButton, {marginBlock: 15, borderColor: "#2c6724", borderWidth: 1}]} onPress={handlePickPortfolioImages} >
        <Text style={{color: "#fff", fontFamily: "Mont"}}>Ajouter des photos</Text>
      </TouchableOpacity>
      </View>

      <View style={{ marginTop: 20 }}>
        {saving ? (
          <ActivityIndicator />
        ) : (
          <TouchableWithoutFeedback
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
        )}
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
  container: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 15
  },
  header: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 90,
  zIndex: 10,
  justifyContent: "flex-end",
  padding: 10,
},
  title: { fontSize: 22, fontFamily: "Montt" },
  box: {
backgroundColor: "#247868",
width: "100%",
alignItems: "center",
justifyContent: "center",
padding: 10,
borderRadius: 20
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
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 50,
  },
  portfolioContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  imageWrapper: {
    position: "relative",
    margin: 5,
  },
  portfolioImage: {
    width: 95,
    height: 95,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff"
  },
  deleteButton: {
  position: "absolute",
  top: -8,
  right: -8,
  backgroundColor: "rgb(255, 255, 255)",
  padding: 4,
  borderRadius: 10,
  justifyContent: "center",
  alignItems: "center",
},
  deleteText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  loaderOverlay: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  skillsContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20, justifyContent: "center" },
  skillButton: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#ccc",
  margin: 5,
},

skillSelected: {
  backgroundColor: "#2ebcf9",
  borderColor: "#4CAF50",
},
equipmentSelected: {
backgroundColor: "#ebed4d",
  borderColor: "#4CAF50",
},
  badge: { backgroundColor: "#d4edda", padding: 8, borderRadius: 8, marginBottom: 10 },
  badgeText: { color: "#415715", fontWeight: "bold" },
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