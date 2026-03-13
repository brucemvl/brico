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
    View
} from "react-native";

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
<TextInput style={styles.input} value={location} onChangeText={setLocation}/>

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