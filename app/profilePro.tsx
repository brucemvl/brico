import React, { useEffect, useState } from "react";
import {
    Alert, Button, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useApi } from "../services/api";

const categories = ["plomberie", "électricité", "peinture", "agencement", "divers"];

export default function ProfilePro() {
  const { apiFetch } = useApi();

  const [email, setEmail] = useState(""); // lecture seule
  const [phone, setPhone] = useState("");
  const [siret, setSiret] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [equipment, setEquipment] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Récupération du profil existant
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
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Impossible de récupérer le profil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const toggleSkill = (skill: string) => {
    if (skills.includes(skill)) setSkills(skills.filter((s) => s !== skill));
    else setSkills([...skills, skill]);
  };

  const handleSave = async () => {
    try {
      await apiFetch("/users/profile/pro", {
        method: "PUT",
        body: JSON.stringify({ phone, siret, location, description, equipment, skills }),
      });
      Alert.alert("Succès", "Profil mis à jour !");
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Impossible de sauvegarder");
    }
  };

  if (loading) return <Text>Chargement...</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mon Profil Professionnel</Text>

      <Text>Email</Text>
      <TextInput style={styles.input} value={email} editable={false} />

      <Text>Téléphone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Ex: 06 12 34 56 78" />

      <Text>Localisation</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Ex: Lyon" />

      <Text>SIRET (facultatif)</Text>
      <TextInput style={styles.input} value={siret} onChangeText={setSiret} keyboardType="numeric" maxLength={14} placeholder="14 chiffres" />

      {siret.length === 14 && (
        <View style={styles.badge}><Text style={styles.badgeText}>✔ Badge PRO activé</Text></View>
      )}

      <Text>Description</Text>
      <TextInput style={[styles.input, { height: 100 }]} value={description} onChangeText={setDescription} multiline placeholder="Présentez votre activité..." />

      <Text>Matériel utilisé</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={equipment} onChangeText={setEquipment} multiline placeholder="Ex: Caméra thermique..." />

      <Text style={{ marginTop: 20 }}>Compétences</Text>
      <View style={styles.skillsContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.skillButton, skills.includes(cat) && styles.skillSelected]}
            onPress={() => toggleSkill(cat)}
          >
            <Text>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button title="Enregistrer" onPress={handleSave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 15 },
  skillsContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  skillButton: { borderWidth: 1, borderRadius: 20, padding: 8, marginRight: 8, marginBottom: 8 },
  skillSelected: { backgroundColor: "#d4edda" },
  badge: { backgroundColor: "#d4edda", padding: 8, borderRadius: 8, marginBottom: 10 },
  badgeText: { color: "#155724", fontWeight: "bold" },
});