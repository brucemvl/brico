import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Autocomplete from "react-native-autocomplete-input";
import { useApi } from "../services/api";


const categories = ["Plomberie", "Electricité", "Peinture", "Agencement", "Carrelage", "Divers"];

const equipmentOptions = [
  "Caisse à outils",
  "Perceuse",
  "Vis / Chevilles",
  "Ponceuse",
  "Multimètre",
  "Escabeau",
  "Camion",
  "Laser",
  "Bache de protection",
  "Scie sauteuse",
   "Scie circulaire"
];

export default function ProfilePro() {
  const { apiFetch } = useApi();
  const router = useRouter();

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

  const [locationQuery, setLocationQuery] = useState("");
  const [cities, setCities] = useState([]);

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
  const removePortfolioImage = (img: any, index: number) => {
    const fadeAnim = new Animated.Value(1);

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      if (img._id) {
        await apiFetch(`/users/profile/pro/portfolio/${img._id}`, {
          method: "DELETE",
        });
      }
      setPortfolio((prev) => prev.filter((_, i) => i !== index));
    });
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

  const searchCities = async (text) => {
  setLocationQuery(text);

  if (text.length < 2) {
    setCities([]);
    return;
  }

  try {
    // On filtre par nom + département
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${text}&fields=departement,code,centre&limit=10`
    );

    const data = await res.json();

    // Trier pour mettre Bagneux 92 en premier
    const sorted = data.sort((a, b) => {
      if (a.departement.code === "92") return -1;
      if (b.departement.code === "92") return 1;
      return 0;
    });

    setCities(sorted);
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
      Alert.alert("Erreur", err.message || "Erreur sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <View>
      <LinearGradient colors={["#f3f3f3", "#f3f3f3", "#f3f3f3", "#f3f3f3de"]}  style={styles.header}></LinearGradient>
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mon Profil</Text>

      <Text style={{fontFamily: "Mont", color: "#000000"}}>Photo de profil</Text>
      {profileImage && (
    <Image
      source={{ uri: profileImage.url || profileImage.uri }}
      style={styles.profileImage}
    />
)}
<View style={{flexDirection: "row", gap: 20}}>
      <TouchableOpacity style={styles.addProfileButton} onPress={handlePickProfileImage} >
        <Text style={{ color: "white", fontFamily: "Mont" }}>Choisir une photo</Text>
        </TouchableOpacity>
      <TouchableOpacity
      style={styles.deleteProfileButton}
      onPress={handleDeleteProfileImage}
    >
      <Text style={{ color: "white", fontFamily: "Mont" }}>Supprimer</Text>
    </TouchableOpacity>
    </View>

<View style={styles.box}>
      <Text style={{fontFamily: "Mont", color: "#ffffff"}}>Nom</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
</View>

<View style={styles.box}>
      <Text style={{fontFamily: "Mont", color: "#ffffff"}}>Email</Text>
      <TextInput style={styles.input} value={email} editable={false} />
</View>

<View style={styles.box}>
      <Text style={{fontFamily: "Mont", color: "#ffffff"}}>Téléphone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} />
</View>

<View style={[styles.box, {paddingBottom: 20}]}>
      <Text style={{fontFamily: "Mont", color: "#ffffff", marginBottom: 10}}>Localisation</Text>
      <Autocomplete
        data={cities}
        value={locationQuery}
        onChangeText={searchCities}
        placeholder="Tapez une ville..."
        style={{width: 320, fontFamily: "Londrina"}}
      
        flatListProps={{
          keyExtractor: (item) => item.code,
          renderItem: ({ item }) => (
            <TouchableOpacity
              onPress={() => {
                const selected = `${item.nom} (${item.departement.code})`;
                setLocation(selected);
                setLocationQuery(selected);
                setCities([]);
              }}
            >
              <Text style={{ padding: 10 }}>
                {item.nom} ({item.departement.code})
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      </View>

<View style={styles.box}>
      <Text style={{fontFamily: "Mont", color: "#ffffff"}}>SIRET</Text>
      <TextInput style={styles.input} value={siret} onChangeText={setSiret} keyboardType="numeric" maxLength={14} />
      {siret.length === 14 && (
        <View style={styles.badge}><Text style={styles.badgeText}>✔ Badge PRO activé</Text></View>
      )}
      </View>

<View style={styles.box}>
      <Text style={{fontFamily: "Mont", color: "#ffffff"}}>Description</Text>
      <TextInput style={[styles.input, { height: 100 }]} value={description} onChangeText={setDescription} multiline />
</View>

<View style={styles.box}>
      <Text style={{ marginBottom: 15, fontFamily: "Mont", color: "#ffffff" }}>Compétences</Text>
      <View style={styles.skillsContainer}>
        {categories.map((cat) => (
          <TouchableOpacity key={cat} style={[styles.skillButton, skills.includes(cat) && styles.skillSelected]} onPress={() => toggleSkill(cat)}>
            <Text style={{fontFamily: "Montt", color: skills.includes(cat) ?  "black" : "#ccc" }}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      </View>

      <View style={styles.box}>
      <Text style={{fontFamily: "Mont", color: "#ffffff"}}>Matériel</Text>
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

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => removePortfolioImage(img, index)}
            >
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.addProfileButton, {marginBlock: 15, borderColor: "#2c6724", borderWidth: 1}]} onPress={handlePickPortfolioImages} >
        <Text style={{color: "white", fontFamily: "Mont"}}>Ajouter des photos</Text>
      </TouchableOpacity>
      </View>

      <View style={{ marginTop: 30 }}>
        {saving ? (
          <ActivityIndicator />
        ) : (
<TouchableOpacity style={styles.saveButton} onPress={handleSave}>
  <Text style={styles.saveText}>Enregistrer</Text>
</TouchableOpacity>
        )}
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 160,
    paddingHorizontal: 20,
    paddingBottom: 80,
    gap: 15
  },
  header: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 120,
  zIndex: 10,
  justifyContent: "flex-end",
  padding: 15,
},
  title: { fontSize: 22, fontFamily: "Montt" },
  box: {
backgroundColor: "#3e9040",
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
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  deleteButton: {
  position: "absolute",
  top: -8,
  right: -8,
  backgroundColor: "rgba(0,0,0,0.6)",
  width: 24,
  height: 24,
  borderRadius: 12,
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
  
  backgroundColor: "#83da77",
  padding: 10,
  borderRadius: 20,

},
saveButton: {
  backgroundColor: "#1592cc",
  width: "100%",
  padding: 15,
  borderRadius: 25,
  alignItems: "center",
},

saveText: {
  color: "white",
  fontFamily: "Montt",
  fontSize: 16,
},

});