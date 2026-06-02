import BackButton from "@/components/BackButton";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import fond from "../assets/convert_1.png";
import { useApi } from "../services/api";

type City = {
  code: string;
  nom: string;
  departement: {
    code: string;
  };
};


export default function CreateRequestForm() {
  const { apiFetch } = useApi();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Plomberie");
  const [budget, setBudget] = useState("");
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [locationQuery, setLocationQuery] = useState("");
const [cities, setCities] = useState<City[]>([]);
  const [location, setLocation] = useState("");
      const [showCityOverlay, setShowCityOverlay] = useState(false);
  

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // uniquement images
      allowsEditing: true,  // permet de recadrer
      quality: 0.8,         // compression
      base64: false,         // inutile si tu uploades le fichier
      exif: false,
      allowsMultipleSelection: true, // si tu veux sélectionner plusieurs
    });

    if (!result.canceled) {
      setImages(result.assets);
    }
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

  const handleSubmit = async () => {
    if (!title || !location || !category) {
      Alert.alert("Erreur", "Champs obligatoires manquants.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("location", location);
      formData.append("budget", budget);

      images.forEach((img, index) => {
        formData.append("images", {
          uri: img.uri,
          name: `photo_${index}.jpg`,
          type: "image/jpeg",
        } as any);
      });

      await apiFetch("/requests", {
        method: "POST",
        body: formData,

      });

      Alert.alert("Succès", "Demande créée !");
      router.replace("/homeClient");

    } catch (err: any) {
      Alert.alert("Erreur", err?.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (

    <ImageBackground source={fond} style={{ flex: 1 }} accessible accessibilityLabel="Écran de création de demande">
      <BackButton />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={10}
      >
        <ScrollView style={{ padding: 20, paddingTop: 120 }}>
          <Text style={styles.title} accessible accessibilityRole="header">Titre*</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input} accessible
            accessibilityLabel="Titre de la demande"
            accessibilityHint="Entrer le titre de votre demande" />

          <Text style={styles.title}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline style={styles.input}
            accessible
            accessibilityLabel="Description"
            accessibilityHint="Décrire votre besoin" />

          <Text style={styles.title}>Catégorie*</Text>
          <Picker
            selectedValue={category}
            onValueChange={setCategory}
            style={{ backgroundColor: "#fcfcfc", borderWidth: 1, marginBottom: 20, borderRadius: 16 }}
            accessible
            accessibilityLabel="Catégorie"
            accessibilityHint="Choisir une catégorie de travaux"
          >
            <Picker.Item label="Plomberie" value="Plomberie"/>
            <Picker.Item label="Peinture" value="Peinture" />
            <Picker.Item label="Agencement" value="Agencement" />
            <Picker.Item label="Electricité" value="Electricité" />
            <Picker.Item label="Carrelage" value="Carrelage" />
            <Picker.Item label="Divers" value="Divers" />
          </Picker>

          <Text style={styles.title}>Ville*</Text>

          
          <TextInput
              value={locationQuery}
              onChangeText={searchCities}
              placeholder="Tapez une ville..."
              style={{
                width: "100%",
                fontFamily: "Londrina",
                backgroundColor: "#fff",
                padding: 10,
                borderRadius: 8,
                borderWidth: 1
              }}
              accessible
              accessibilityLabel="Rechercher une ville"
              accessibilityHint="Tapez pour afficher les suggestions"
              autoCorrect={false}
              autoCapitalize="words"
            />
          <Text style={[styles.title, { marginTop: 15 }]}>Budget</Text>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric" style={styles.input}
            accessible
            accessibilityLabel="Budget"
            accessibilityHint="Entrer votre budget estimé" />

          <TouchableOpacity
            onPress={pickImages}
            style={{ backgroundColor: "#c8c8c8", padding: 10, marginBottom: 20, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Ajouter des images"
            accessibilityHint="Sélectionner des photos pour illustrer votre demande"
          >
            <Text style={{ fontFamily: "Montt" }}>+ Ajouter des images</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {images.map((img, index) => (
              <Image key={index} accessible={false} source={{ uri: img.uri }} style={{ width: 80, height: 80, margin: 5 }} />
            ))}
          </View>

          {loading ? <ActivityIndicator size="large" /> :
            <TouchableOpacity
              onPress={handleSubmit}
              style={{ alignSelf: "center", marginTop: 10, backgroundColor: "#007AFF", padding: 12, borderRadius: 20, marginBottom: 20 }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Créer la demande"
              accessibilityHint="Publier votre demande de service" >
              <Text style={{ fontFamily: "Kanitt", color: "white" }}>Créer la demande</Text></TouchableOpacity>}
        </ScrollView>
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
  title: {
    fontFamily: "Montt",
    fontSize: 16,
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    marginBottom: 15,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#fcfcfc",
    lineHeight: 18,
    padding: 2,
    fontFamily: "Mont"
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
})