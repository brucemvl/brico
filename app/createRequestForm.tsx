import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { useApi } from "../services/api";

export default function CreateRequestForm() {
  const { apiFetch } = useApi();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("plomberie");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");

  const handleSubmit = async () => {
    if (!title || !location || !category) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires.");
      return;
    }

    try {
      console.log("Token envoyé via apiFetch");

      const res = await apiFetch("/requests", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          category,
          location,
          budget: Number(budget) || 0,
        }),
      });

      console.log("Data reçue:", res);
      Alert.alert("Succès", "Demande créée !");

      // Reset form
      setTitle("");
      setDescription("");
      setLocation("");
      setBudget("");
      setCategory("plomberie");
    } catch (err: any) {
      console.error("Erreur API:", err.message);
      Alert.alert("Erreur API", err.message);
    }
  };

  return (
    <View style={{ padding: 16, flex: 1, paddingTop: 100 }}>
      <Text>Titre*</Text>
      <TextInput
        placeholder="Ex: Fuite évier"
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, marginBottom: 12, padding: 8 }}
      />

      <Text>Description</Text>
      <TextInput
        placeholder="Détaillez votre problème"
        value={description}
        onChangeText={setDescription}
        multiline
        style={{ borderWidth: 1, marginBottom: 12, padding: 8, height: 80 }}
      />

      <Text>Catégorie*</Text>
      <Picker
        selectedValue={category}
        onValueChange={(itemValue) => setCategory(itemValue)}
        style={{ marginBottom: 12 }}
      >
        <Picker.Item label="Plomberie" value="plomberie" />
        <Picker.Item label="Peinture" value="peinture" />
        <Picker.Item label="Agencement" value="agencement" />
        <Picker.Item label="Divers" value="divers" />
      </Picker>

      <Text>Lieu*</Text>
      <TextInput
        placeholder="Ex: Paris"
        value={location}
        onChangeText={setLocation}
        style={{ borderWidth: 1, marginBottom: 12, padding: 8 }}
      />

      <Text>Budget (€)</Text>
      <TextInput
        placeholder="Ex: 200"
        value={budget}
        onChangeText={setBudget}
        keyboardType="numeric"
        style={{ borderWidth: 1, marginBottom: 12, padding: 8 }}
      />

      <Button title="Créer la demande" onPress={handleSubmit} />
    </View>
  );
}