import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
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
import Autocomplete from "react-native-autocomplete-input";


import { useApi } from "../services/api";

export default function ProfileClient() {

  const { apiFetch } = useApi();
  const router = useRouter();

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [phone,setPhone] = useState("");
  const [location,setLocation] = useState("");
  const [description,setDescription] = useState("");
  const [profileImage,setProfileImage] = useState<any>(null);

  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);

  const [locationQuery, setLocationQuery] = useState("");
    const [cities, setCities] = useState([]);

  const fetchProfile = async () => {

    try{

      const data = await apiFetch("/users/me");

      setName(data.name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setLocation(data.location || "");
      setDescription(data.description || "");
      setProfileImage(data.profileImage || null);

    }catch{
      Alert.alert("Erreur","Impossible de charger le profil");
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{
    fetchProfile();
  },[]);

  const pickImage = async () => {

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if(!permission.granted){
      return Alert.alert("Permission refusée");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing:true,
      aspect:[1,1],
      quality:0.7
    });

    if(!result.canceled){
      setProfileImage({uri: result.assets[0].uri});
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

  const handleSave = async () => {

    try{

      setSaving(true);

      const formData = new FormData();

      formData.append("name",name);
      formData.append("phone",phone);
      formData.append("location",location);
      formData.append("description",description);

      if(profileImage?.uri){

        const manipulated = await ImageManipulator.manipulateAsync(
          profileImage.uri,
          [],
          {compress:0.7, format:ImageManipulator.SaveFormat.JPEG}
        );

        formData.append("profileImage",{
          uri: manipulated.uri,
          name:"profile.jpg",
          type:"image/jpeg"
        } as any);
      }

      await apiFetch("/users/profile/client",{
        method:"PUT",
        body:formData
      });

      Alert.alert("Succès","Profil mis à jour");

      router.replace("/homeClient");

    }catch(err:any){
      Alert.alert("Erreur",err.message || "Erreur sauvegarde");
    }finally{
      setSaving(false);
    }
  };

  if(loading) return <ActivityIndicator size="large"/>;

  return(

<ScrollView contentContainerStyle={styles.container}>

<Text style={styles.title}>Mon Profil</Text>

<Text>Photo</Text>

{profileImage && (
<Image
source={{uri: profileImage.url || profileImage.uri}}
style={styles.profileImage}
/>
)}

<Button title="Choisir une photo" onPress={pickImage}/>

<Text>Nom</Text>
<TextInput style={styles.input} value={name} onChangeText={setName}/>

<Text>Email</Text>
<TextInput style={styles.input} value={email} editable={false}/>

<Text>Téléphone</Text>
<TextInput style={styles.input} value={phone} onChangeText={setPhone}/>

<Text>Localisation</Text>
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

<Text>Description</Text>
<TextInput
style={[styles.input,{height:100}]}
value={description}
onChangeText={setDescription}
multiline
/>

<View style={{marginTop:30}}>

{saving
? <ActivityIndicator/>
: <Button title="Enregistrer" onPress={handleSave}/>
}

</View>

</ScrollView>
  );
}

const styles = StyleSheet.create({

container:{
alignItems:"center",
paddingTop:60,
paddingHorizontal:30,
paddingBottom:80
},

title:{
fontSize:22,
fontWeight:"bold",
marginBottom:20
},

input:{
borderWidth:1,
borderRadius:8,
padding:10,
marginBottom:15,
width:"100%"
},

profileImage:{
width:120,
height:120,
borderRadius:60,
marginBottom:15
}

});