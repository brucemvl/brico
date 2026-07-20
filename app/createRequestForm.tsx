import BackButton from "@/components/BackButton";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
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
import { Dropdown } from "react-native-element-dropdown";
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
      quality: 0.8,         // compression
      base64: false,         // inutile si tu uploades le fichier
      exif: false,
      allowsMultipleSelection: true, // si tu veux sélectionner plusieurs
    });

    if (!result.canceled) {
      setImages(result.assets);
    }
  };

  const data = [
  { label: "🔧 Plomberie", value: "Plomberie" },
  { label: "🎨 Peinture", value: "Peinture" },
  { label: "⚡ Électricité", value: "Electricité" },
  { label: "🧱 Carrelage", value: "Carrelage" },
  { label: "🏠 Agencement", value: "Agencement" },
  { label: "🌳 Jardinage", value: "Jardinage" },
  { label: "📦 Divers", value: "Divers" },
];

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
          <LinearGradient
  colors={["#30a590", "#1a5b4f"]}
  style={styles.heroCard}
>
  <Text style={styles.heroTitle}>
    Nouvelle demande
  </Text>

  <Text style={styles.heroSubtitle}>
    Décrivez votre besoin pour recevoir des propositions de professionnels.
  </Text>
</LinearGradient>

<View style={styles.formCard}>
          <Text style={styles.title} accessible accessibilityRole="header">📝 Titre*</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input} accessible
            accessibilityLabel="Titre de la demande"
            accessibilityHint="Entrer le titre de votre demande"
            placeholder="Ex : Réparer une fuite de lavabo" />


          <Text style={styles.title}>📄 Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Expliquez précisément votre besoin..."
  textAlignVertical="top"
  style={styles.descriptionInput}
            accessible
            accessibilityLabel="Description"
            accessibilityHint="Décrire votre besoin" />


          <Text style={styles.title}>🛠 Catégorie*</Text>
          <View style={styles.pickerContainer}>
          <Dropdown
  data={data}
  labelField="label"
  valueField="value"
  value={category}
  placeholder="Choisir une catégorie"
  onChange={item => setCategory(item.value)}
  fontFamily="Mont"
/>

</View>
          <Text style={[styles.title, { marginTop: 15 }]}>💰 Budget</Text>
          <TextInput
            value={budget}
            placeholder="Ex : 150 €"
            onChangeText={setBudget}
            keyboardType="numeric" style={styles.input}
            accessible
            accessibilityLabel="Budget"
            accessibilityHint="Entrer votre budget estimé" />

          <Text style={styles.title}>📍 Ville*</Text>

          
          <TextInput
              value={locationQuery}
              onChangeText={searchCities}
              placeholder="Tapez une ville..."
              style={styles.input}
              accessible
              accessibilityLabel="Rechercher une ville"
              accessibilityHint="Tapez pour afficher les suggestions"
              autoCorrect={false}
              autoCapitalize="words"
            />
          

          <TouchableOpacity
            onPress={pickImages}
            style={styles.imageButton}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Ajouter des images"
            accessibilityHint="Sélectionner des photos pour illustrer votre demande"
          >
            <Text style={styles.imageButtonText}>
  📷 Ajouter des photos
</Text>
          </TouchableOpacity>

          <View style={styles.imagePreviewContainer}>
            {images.map((img, index) => (
              <Image key={index} accessible={false} source={{ uri: img.uri }} style={styles.previewImage} />
            ))}
          </View>

          {loading ? <ActivityIndicator size="large" /> :
            <TouchableOpacity
              onPress={handleSubmit}
style={styles.submitButton}              accessible
              accessibilityRole="button"
              accessibilityLabel="Créer la demande"
              accessibilityHint="Publier votre demande de service" >
              <LinearGradient
        colors={["#30a590","#1a5b4f"]}
        style={styles.submitGradient}
    >
        <Text style={styles.submitText}>
            Publier ma demande
        </Text>
    </LinearGradient>
    </TouchableOpacity>}
</View>
          
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
    marginTop: 6,
    color:"#1a5b4f",
  },
  input: {
    backgroundColor:"#eff1f6",

  borderRadius:18,

  paddingHorizontal:18,
  paddingVertical:14,

  fontFamily:"Mont",

  borderWidth:1,
  borderColor:"#ECECEC",

  marginBottom:15
  },
  descriptionInput:{
  backgroundColor:"#F7F8FA",

  minHeight:140,

  borderRadius:20,

  padding:16,

  fontFamily:"Mont",

  borderWidth:1,
  borderColor:"#ECECEC",

  marginBottom:15
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
  width:"92%",

  maxHeight:"65%",

  backgroundColor:"#fff",

  borderRadius:28,

  padding:20,

  shadowColor:"#000",
  shadowOpacity:0.15,
  shadowRadius:20,

  elevation:10
},

overlayTitle: {
  fontSize: 16,
  fontFamily: "Montt",
  marginBottom: 10,
},

cityItem: {
  paddingVertical:15,
    borderBottomWidth:1,
    borderBottomColor:"#F2F2F2",
},

cityText: {
fontFamily:"Mont",
    fontSize:15,
  },
heroCard:{
  width:"100%",
  borderRadius:28,
  padding:24,
  marginBottom:25,

  shadowColor:"#000",
  shadowOpacity:0.15,
  shadowRadius:15,
  shadowOffset:{width:0,height:8},

  elevation:8,
},

heroTitle:{
  color:"#fff",
  fontSize:28,
  fontFamily:"Londrinak"
},

heroSubtitle:{
  color:"rgba(255,255,255,0.9)",
  fontFamily:"Mont",
  marginTop:8,
  lineHeight:20
},
formCard:{
  backgroundColor:"#fff",

  borderRadius:30,
  gap: 10,
marginBottom: 100,
  padding:20,

  shadowColor:"#000",
  shadowOpacity:0.08,
  shadowRadius:15,
  shadowOffset:{
    width:0,
    height:6
  },

  elevation:5
},
pickerContainer:{
    backgroundColor:"#eff1f6",
    borderRadius:18,
    borderWidth:1,
    borderColor:"#ECECEC",
    overflow:"hidden",
    padding: 10
},

picker:{
    fontFamily:"Mont",
},
imageButton:{
  height:60,

  borderRadius:18,

  borderWidth:2,
  borderStyle:"dashed",

  borderColor:"#30a590",

  justifyContent:"center",
  alignItems:"center",

  marginTop:8,
  marginBottom:10,

  backgroundColor:"rgba(48,165,144,0.06)"
},

imageButtonText:{
  fontFamily:"Montt",
  color:"#1a5b4f"
},
imagePreviewContainer:{
    flexDirection:"row",
    flexWrap:"wrap",
    gap:12,
    marginBottom:20
},

previewImage:{
    width:90,
    height:90,
    borderRadius:18,
},
submitButton:{
    width: "80%",
    alignSelf: "center"
},

submitGradient:{
    height:60,
    borderRadius:30,
    justifyContent:"center",
    alignItems:"center",
},

submitText:{
    color:"#fff",
    fontFamily:"Montt",
    fontSize:16
}
})