import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useApi } from "../services/api";

const categories = ["plomberie", "électricité", "peinture", "agencement", "divers"];

export default function ProfilePro() {
  const { apiFetch } = useApi();

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

  // 🔹 Fetch profil
  const fetchProfile = async () => {
    try {
      const data = await apiFetch("/users/me");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setSiret(data.siret || "");
      setLocation(data.location || "");
      setDescription(data.description || "");
      setEquipment(data.equipment || "");
      setSkills(data.skills || []);
      setProfileImage(data.profileImage || null);
      setPortfolio(data.portfolio || []);
    } catch (err) {
      Alert.alert("Erreur", "Impossible de récupérer le profil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // 🔹 Image Picker
  const handlePickProfileImage = async () => {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permission refusée', 'Accès à la galerie requis');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    let uri = result.assets[0].uri;
    if (uri.startsWith('file://')) uri = uri.replace('file://', '');

    setProfileImage({ uri });
  } catch (err: any) {
    console.error(err);
    Alert.alert('Erreur', err.message || 'Impossible de sélectionner la photo');
  }
};

const handlePickPortfolioImages = async () => {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permission refusée', 'Accès à la galerie requis');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (result.canceled) return;

    const newImages = result.assets.map((asset) => {
      let uri = asset.uri;
      if (uri.startsWith('file://')) uri = uri.replace('file://', '');
      return { uri };
    });

    setPortfolio((prev) => [...prev, ...newImages]);
  } catch (err: any) {
    console.error(err);
    Alert.alert('Erreur', err.message || 'Impossible de sélectionner les images');
  }
};

  // 🔹 Supprimer image portfolio
  const removePortfolioImage = async (img: any) => {
    try {
      if (img._id) {
        await apiFetch(`/users/profile/pro/portfolio/${img._id}`, { method: "DELETE" });
        fetchProfile();
      } else {
        setPortfolio((prev) => prev.filter((i) => i.uri !== img.uri));
      }
    } catch {
      Alert.alert("Erreur", "Impossible de supprimer l'image");
    }
  };

  const toggleSkill = (skill: string) => {
    if (skills.includes(skill)) setSkills(skills.filter((s) => s !== skill));
    else setSkills([...skills, skill]);
  };


// 🔹 Save profil
const handleSave = async () => {
  try {
    setSaving(true);

    const formData = new FormData();
    formData.append("phone", phone);
    formData.append("siret", siret);
    formData.append("location", location);
    formData.append("description", description);
    formData.append("equipment", equipment);
    formData.append("skills", JSON.stringify(skills));

    if (profileImage?.uri) {
      formData.append("profileImage", {
        uri: profileImage.uri,
        name: "profile.jpg",
        type: "image/jpeg",
      } as any);
    }

    portfolio.forEach((img, idx) => {
      if (img.uri) {
        formData.append("portfolio", {
          uri: img.uri,
          name: `portfolio_${idx}.jpg`,
          type: "image/jpeg",
        } as any);
      }
    });

    await apiFetch("/users/profile/pro", {
      method: "PUT",
      body: formData,
      // ❌ PAS de Content-Type ici
    });

    Alert.alert("✅ Succès", "Profil mis à jour !");
    fetchProfile();
  } catch (err: any) {
    console.error(err);
    Alert.alert("Erreur", err.message || "Impossible de sauvegarder");
  } finally {
    setSaving(false);
  }
};

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mon Profil Professionnel</Text>
      <Text>Email</Text>
      <TextInput style={styles.input} value={email} editable={false} />

      <Text>Photo de profil</Text>
      {profileImage && <Image source={{ uri: profileImage.url || profileImage.uri }} style={styles.profileImage} />}
      <Button title="Choisir une photo" onPress={handlePickProfileImage} />

      <Text>Téléphone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} />

      <Text>Localisation</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} />

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
          <TouchableOpacity key={index} onPress={() => removePortfolioImage(img)}>
            <Image source={{ uri: img.url || img.uri }} style={styles.portfolioImage} />
          </TouchableOpacity>
        ))}
      </View>
      <Button title="Ajouter des photos" onPress={handlePickPortfolioImages} />

      <View style={{ marginTop: 30 }}>
        {saving ? <ActivityIndicator /> : <Button title="Enregistrer" onPress={handleSave} />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingTop: 60, paddingHorizontal: 30, paddingBottom: 80 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 15, width: "100%" },
  profileImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 15 },
  portfolioContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  portfolioImage: { width: 100, height: 100, margin: 5, borderRadius: 8 },
  skillsContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20, justifyContent: "center" },
  skillButton: { borderWidth: 1, borderRadius: 20, padding: 8, marginRight: 8, marginBottom: 8 },
  skillSelected: { backgroundColor: "#d4edda" },
  badge: { backgroundColor: "#d4edda", padding: 8, borderRadius: 8, marginBottom: 10 },
  badgeText: { color: "#155724", fontWeight: "bold" },
});