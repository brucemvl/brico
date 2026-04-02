import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import {
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import Autocomplete from "react-native-autocomplete-input";
import { AuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";



const { width } = Dimensions.get("window");

const categories = ["Plomberie", "Electricité", "Peinture", "Agencement", "Carrelage", "Divers"];

const equipmentOptions = [
  "Caisse à outils",
  "Perceuse",
  "Vis / Chevilles",
  "Ponceuse",
  "Multimètre",
  "Escabeau",
  "Camion",
];

export default function OnboardingPro() {
  const router = useRouter();
  const { apiFetch } = useApi();

  const [step, setStep] = useState(0);

  const context = useContext(AuthContext);
if (!context) throw new Error("AuthContext non fourni");

const { user, login } = context;

  // 🔹 states
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const [locationQuery, setLocationQuery] = useState("");
    const [cities, setCities] = useState([]);

  const steps = [
    "infos",
    "location",
    "skills",
    "equipment",
    "description"
  ];

  const progress = (step + 1) / steps.length;

  const toggleSkill = (skill: string) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter(s => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  };

  const toggleEquipment = (item: string) => {
    if (equipment.includes(item)) {
      setEquipment(equipment.filter(e => e !== item));
    } else {
      setEquipment([...equipment, item]);
    }
  };

  const saveStep = async (data: any) => {
  try {
    if (!user?.token) throw new Error("Token manquant");

    const formData = new FormData();

    Object.keys(data).forEach((key) => {
      const value = data[key];

      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value)); // 👈 important pour skills/equipment
      } else {
        formData.append(key, value);
      }
    });

    const res = await fetch("http://192.168.1.11:5000/api/users/profile/pro", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${user.token}`, // ❗ PAS de Content-Type
      },
      body: formData,
    });

    const text = await res.text();

    try {
      const json = JSON.parse(text);
      console.log("SAVE OK:", json);
    } catch {
      console.log("Réponse non JSON save:", text);
    }

  } catch (err) {
    console.log("Erreur save", err);
  }
};

  const nextStep = () => {
  if (step < steps.length - 1) {
    setStep(step + 1);
  } else {
    completeOnboarding(); // ✅ IMPORTANT
  }
};

  const skipStep = () => {
    nextStep();
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

  const completeOnboarding = async () => {
  try {
    if (!user?.token) {
      throw new Error("Token manquant");
    }

    const res = await fetch(
      "http://192.168.1.11:5000/api/users/onboarding-complete",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      }
    );

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.log("Réponse non JSON :", text);
      throw new Error("Réponse serveur invalide");
    }

    if (!res.ok) {
      throw new Error(data.error || "Erreur onboarding");
    }

    // ✅ mettre à jour AsyncStorage + contexte via login
    await login({
      ...user,
      onboardingCompleted: true,
    });

    // ✅ redirection
    router.replace("/homePro");

  } catch (err) {
    console.error("Erreur onboarding:", err);
    Alert.alert("Erreur", "Impossible de terminer l'onboarding");
  }
};


  return (
    <View style={styles.container}>

      {/* 🔥 Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${progress * 100}%` }]} />
      </View>

      {/* 🔹 STEP 1 */}
      {step === 0 && (
        <View style={styles.step}>
          <Text style={styles.title}>Ton nom</Text>

          <TextInput
            style={styles.input}
            placeholder="Ex: Jean Dupont"
            value={name}
            onChangeText={setName}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              await saveStep({ name });
              nextStep();
            }}
          >
            <Text style={styles.buttonText}>Continuer</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={skipStep}>
            <Text style={styles.skip}>Passer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🔹 STEP 2 */}
      {step === 1 && (
        <View style={styles.step}>
          <Text style={styles.title}>Ta localisation</Text>

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

          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              await saveStep({ location });
              nextStep();
            }}
          >
            <Text style={styles.buttonText}>Continuer</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={skipStep}>
            <Text style={styles.skip}>Passer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🔹 STEP 3 */}
      {step === 2 && (
        <View style={styles.step}>
          <Text style={styles.title}>Tes compétences</Text>

          <View style={styles.wrap}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.tag,
                  skills.includes(cat) && styles.tagActive
                ]}
                onPress={() => toggleSkill(cat)}
              >
                <Text>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              await saveStep({ skills });
              nextStep();
            }}
          >
            <Text style={styles.buttonText}>Continuer</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={skipStep}>
            <Text style={styles.skip}>Passer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🔹 STEP 4 */}
      {step === 3 && (
        <View style={styles.step}>
          <Text style={styles.title}>Ton matériel</Text>

          <View style={styles.wrap}>
            {equipmentOptions.map(item => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.tag,
                  equipment.includes(item) && styles.tagActive
                ]}
                onPress={() => toggleEquipment(item)}
              >
                <Text>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              await saveStep({ equipment });
              nextStep();
            }}
          >
            <Text style={styles.buttonText}>Continuer</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={skipStep}>
            <Text style={styles.skip}>Passer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🔹 STEP 5 */}
      {step === 4 && (
        <View style={styles.step}>
          <Text style={styles.title}>Description</Text>

          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Décris ton activité..."
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              await saveStep({ description });
              nextStep();
            }}
          >
            <Text style={styles.buttonText}>Terminer</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={skipStep}>
            <Text style={styles.skip}>Passer</Text>
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center"
  },

  progressBar: {
    height: 6,
    backgroundColor: "#eee",
    borderRadius: 10,
    marginBottom: 30
  },

  progress: {
    height: 6,
    backgroundColor: "#007AFF",
    borderRadius: 10
  },

  step: {
    alignItems: "center"
  },

  title: {
    fontSize: 22,
    marginBottom: 20
  },

  input: {
    width: "100%",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20
  },

  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center"
  },

  tag: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 20,
    margin: 5
  },

  tagActive: {
    backgroundColor: "#a0e7ff"
  },

  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 20,
    width: "100%",
    alignItems: "center",
    marginTop: 20
  },

  buttonText: {
    color: "white",
    fontSize: 16
  },

  skip: {
    marginTop: 15,
    color: "#999"
  }
});