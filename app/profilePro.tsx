import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Autocomplete from "react-native-autocomplete-input";
import { useApi } from "../services/api";


const categories = ["plomberie", "électricité", "peinture", "agencement", "divers"];

export default function ProfilePro() {
  const { apiFetch } = useApi();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [siret, setSiret] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [equipment, setEquipment] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const [locationQuery, setLocationQuery] = useState("");
  const [cities, setCities] = useState([]);

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
      setEquipment(data.equipment || "");
      setSkills(data.skills || []);
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
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${text}&fields=departement&limit=5`
    );

    const data = await res.json();
    setCities(data);
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
      formData.append("equipment", equipment);
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mon Profil Professionnel</Text>

      <Text>Photo</Text>
      {profileImage && (
        <Image
          source={{ uri: profileImage.url || profileImage.uri }}
          style={styles.profileImage}
        />
      )}
      <Button title="Choisir une photo" onPress={handlePickProfileImage} />

      <Text>Nom</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text>Email</Text>
      <TextInput style={styles.input} value={email} editable={false} />


      <Text>Téléphone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} />

      <Autocomplete
        data={cities}
        value={locationQuery}
        onChangeText={searchCities}
        placeholder="Tapez une ville..."
        style={{width: 300}}
      
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

      <Text>SIRET</Text>
      <TextInput style={styles.input} value={siret} onChangeText={setSiret} keyboardType="numeric" maxLength={14} />
      {siret.length === 14 && (
        <View style={styles.badge}><Text style={styles.badgeText}>✔ Badge PRO activé</Text></View>
      )}

      <Text>Description</Text>
      <TextInput style={[styles.input, { height: 100 }]} value={description} onChangeText={setDescription} multiline />

      <Text>Matériel utilisé</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={equipment} onChangeText={setEquipment} multiline />

      <Text style={{ marginTop: 20 }}>Compétences</Text>
      <View style={styles.skillsContainer}>
        {categories.map((cat) => (
          <TouchableOpacity key={cat} style={[styles.skillButton, skills.includes(cat) && styles.skillSelected]} onPress={() => toggleSkill(cat)}>
            <Text>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>


      <Text style={{ marginTop: 20 }}>Mes réalisations</Text>

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

      <Button title="Ajouter des photos" onPress={handlePickPortfolioImages} />

      <View style={{ marginTop: 30 }}>
        {saving ? (
          <ActivityIndicator />
        ) : (
          <Button title="Enregistrer" onPress={handleSave} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 30,
    paddingBottom: 80,
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    width: "100%",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
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
    top: -5,
    right: -5,
    backgroundColor: "red",
    width: 22,
    height: 22,
    borderRadius: 11,
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
  skillButton: { borderWidth: 1, borderRadius: 20, padding: 8, marginRight: 8, marginBottom: 8 },
  skillSelected: { backgroundColor: "#d4edda" },
  badge: { backgroundColor: "#d4edda", padding: 8, borderRadius: 8, marginBottom: 10 },
  badgeText: { color: "#155724", fontWeight: "bold" },
});