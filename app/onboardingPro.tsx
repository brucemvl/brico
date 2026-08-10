import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";

type City = {
   nom: string;
    code: string;
     departement: { code: string; };
      centre?: { coordinates: [number, number];

       }; };


const { width } = Dimensions.get("window");

const categories = ["Plomberie", "Electricité", "Peinture", "Agencement", "Carrelage", "Divers", "Jardinage", "Demenagement"];

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

export default function OnboardingPro() {

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

  const router = useRouter();
  const { apiFetch } = useApi();

  const [step, setStep] = useState(0);

  const context = useContext(AuthContext);
if (!context) throw new Error("AuthContext non fourni");

const { user, updateUser } = context;

  // 🔹 states
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [profileImage, setProfileImage] = useState<any>(null);
const [portfolio, setPortfolio] = useState<any[]>([]);

const [loadingSubmit, setLoadingSubmit] = useState(false);

  const [locationQuery, setLocationQuery] = useState("");
    const [cities, setCities] = useState<City[]>([]);

        const [showCityOverlay, setShowCityOverlay] = useState(false);
    

  const steps = [
  "phone",
  "location",
  "skills",
  "equipment",
  "description",
  "profileImage",
  "portfolio"
];

  const pickProfileImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (!result.canceled) {
    setProfileImage(result.assets[0]);
  }
};

const pickPortfolioImages = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    quality: 0.7,
  });

  if (!result.canceled) {
setPortfolio((prev) => [...prev, ...result.assets]);
  }
};

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
    await apiFetch("/users/profile/pro", {
      method: "PUT",
      body: data, // JSON simple
    });
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

  const searchCities = async (text: string) => {
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

    const data: City[] = await res.json();

    const sorted = data.sort((a: City, b: City) => {
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

  const completeOnboarding = async () => {
  try {
    if (!user) throw new Error("User absent");

    setLoadingSubmit(true); // 🔥 START LOADING

    const formData = new FormData();

    formData.append("phone", phone);
    formData.append("location", location);
    formData.append("description", description);
    formData.append("skills", JSON.stringify(skills));
    formData.append("equipment", JSON.stringify(equipment));

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

    for (let i = 0; i < portfolio.length; i++) {
      const img = portfolio[i];

      if (!img.uri) continue;

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

    await apiFetch("/users/profile/pro", {
      method: "PUT",
      body: formData,
    });

    await apiFetch("/users/onboarding-complete", {
  method: "PUT",
});

updateUser({ onboardingCompleted: true });
await updateUser({ onboardingCompleted: true });

router.replace("/homePro");



  } catch (err) {
    console.error("Erreur onboarding:", err);
    Alert.alert("Erreur", "Impossible de terminer l'onboarding");
  } finally {
    setLoadingSubmit(false); // 🔥 STOP LOADING
  }
};


  return (
    <View style={styles.container}>
  
  <TouchableOpacity onPress={skipStep}>
    <Text style={styles.skip}>Ignorer {">>"}</Text>
  </TouchableOpacity>


      {/* 🔥 Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${progress * 100}%` }]} />
      </View>

      

      {/* 🔹 STEP 1 */}
      {step === 0 && (
        <View style={styles.step}>
          <Text style={styles.title}>Ton numero</Text>

          <TextInput
            style={styles.input}
            value={phone}
            keyboardType="numeric"
            onChangeText={setPhone}
          />
          <Text style={{fontFamily: "Mont", color: "#1a5b4f", marginTop: -10, marginBottom: 10}}>* visible uniquement en cas d'accord</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              await saveStep({ phone });
              nextStep();
            }}
          >
            <Text style={styles.buttonText}>Continuer</Text>
          </TouchableOpacity>

          
        </View>
      )}

      {/* 🔹 STEP 2 */}
      {step === 1 && (
        <View style={styles.step}>
          <Text style={styles.title}>Ta ville</Text>

          <TextInput
              value={locationQuery}
              onChangeText={searchCities}
              placeholder="Tapez une ville..."
              style={{
                borderWidth: 1,
              borderColor: "#247868",
              borderRadius: 12,
              padding: 10,
              marginBottom: 15,
              marginTop: 10,
              width: "100%",
              backgroundColor: "#f1f1f1",
              
              fontFamily: "Londrina",
              fontSize: 16
              }}
              accessible
              accessibilityLabel="Rechercher une ville"
              accessibilityHint="Tapez pour afficher les suggestions"
              autoCorrect={false}
              autoCapitalize="words"
            />

          <TouchableOpacity
  style={[
    styles.button,
    !location && { opacity: 0.5 }
  ]}
  disabled={!location}
  onPress={async () => {
    await saveStep({ location });
    nextStep();
  }}
>
  <Text style={styles.buttonText}>Continuer</Text>
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
                <Text style={{fontFamily: "Mont"}}>{cat}</Text>
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
                <Text style={{fontFamily: "Mont"}}>{item}</Text>
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

          
        </View>
      )}

      {/* 🔹 STEP 5 */}
      {step === 4 && (
        <View style={styles.step}>
          <Text style={styles.title}>Description</Text>

          <TextInput
            style={[styles.input, { height: 100, fontFamily: "Londrina" }]}
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
            <Text style={styles.buttonText}>Continuer</Text>
          </TouchableOpacity>

        
        </View>
      )}

{/* 🔹 STEP 6 */}
      {step === 5 && (
  <View style={styles.step}>
    <Text style={styles.title}>Photo de profil</Text>
{profileImage && (
  <Image source={{ uri: profileImage.uri }} style={{ width: 100, height: 100 }} />
)}
    <TouchableOpacity onPress={pickProfileImage} style={styles.button}>
      <Text style={styles.buttonText}>Choisir une photo</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.button}
      onPress={nextStep}
    >
      <Text style={styles.buttonText}>Continuer</Text>
    </TouchableOpacity>
  </View>
)}

{/* 🔹 STEP 7 */}

{step === 6 && (
  <View style={styles.step}>
    <Text style={styles.title}>Tes réalisations</Text>
              <Text style={{fontFamily: "Mont", color: "#1a5b4f", marginTop: -10, marginBottom: 10}}>* 10 photos maximum</Text>

    <View style={{flexDirection: "row", flexWrap: "wrap", width: "100%", alignItems: "center", justifyContent: "center"}}>
{portfolio.map((image, index) => (
  <Image
    key={index}
    source={{ uri: image.uri }}
    style={{ height: 100, width: 100, margin: 5 }}
  />
))}
</View>
    <TouchableOpacity onPress={pickPortfolioImages} style={styles.button}>
      <Text style={styles.buttonText}>Ajouter des photos</Text>
    </TouchableOpacity>

    <TouchableOpacity
  style={[styles.button, loadingSubmit && { opacity: 0.7 }]}
  onPress={completeOnboarding}
  disabled={loadingSubmit}
>
  {loadingSubmit ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text style={styles.buttonText}>Terminer</Text>
  )}
</TouchableOpacity>
  </View>
)}

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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingInline: 30,
    paddingTop: 120
  },

  progressBar: {
    height: 6,
    backgroundColor: "#e6e6e6",
    borderRadius: 10,
    marginBottom: 30
  },

  progress: {
    height: 6,
    backgroundColor: "#1a5b4f",
    borderRadius: 10
  },

  step: {
    alignItems: "center",
    gap: 10
  },

  title: {
    fontSize: 22,
    marginBottom: 20,
    fontFamily: "Montt"
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
    margin: 4
  },

  tagActive: {
    backgroundColor: "#44d5aa"
  },

  button: {
    backgroundColor: "#1a5b4f",
    padding: 15,
    borderRadius: 20,
    width: "80%",
    alignItems: "center",
    marginTop: 20
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Mont"
  },

  skip: {
    marginTop: 15,
    color: "#999",
    fontFamily: "Kanito"
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