import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Autocomplete from "react-native-autocomplete-input";
import { useApi } from "../services/api";

export default function CreateRequestForm() {
  const { apiFetch } = useApi();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("plomberie");
  const [budget, setBudget] = useState("");
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [locationQuery, setLocationQuery] = useState("");
const [cities, setCities] = useState([]);
const [location, setLocation] = useState("");

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
    <ScrollView style={{ padding: 20, paddingTop: 80 }}>
      <Text>Titre*</Text>
      <TextInput value={title} onChangeText={setTitle} style={{ borderWidth: 1, marginBottom: 10 }} />

      <Text>Description</Text>
      <TextInput value={description} onChangeText={setDescription} multiline style={{ borderWidth: 1, marginBottom: 10 }} />

      <Text>Catégorie*</Text>
      <Picker selectedValue={category} onValueChange={setCategory}>
        <Picker.Item label="Plomberie" value="Plomberie" />
        <Picker.Item label="Peinture" value="Peinture" />
        <Picker.Item label="Agencement" value="Agencement" />
        <Picker.Item label="Electricité" value="Electricité" />
        <Picker.Item label="Carrelage" value="Carrelage" />
        <Picker.Item label="Divers" value="Divers" />
      </Picker>

      <Text>Ville*</Text>

<Autocomplete
  data={cities}
  value={locationQuery}
  onChangeText={searchCities}
  placeholder="Tapez une ville..."

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
      <Text>Budget</Text>
      <TextInput value={budget} onChangeText={setBudget} keyboardType="numeric" style={{ borderWidth: 1, marginBottom: 10 }} />

      <TouchableOpacity onPress={pickImages} style={{ backgroundColor: "#ddd", padding: 10, marginBottom: 10 }}>
        <Text>Ajouter des images</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {images.map((img, index) => (
          <Image key={index} source={{ uri: img.uri }} style={{ width: 80, height: 80, margin: 5 }} />
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" /> : <Button title="Créer la demande" onPress={handleSubmit} />}
    </ScrollView>
  );
}