import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import trash from "../assets/icons/trash2.png";
import { useApi } from "../services/api";


type ImageType = {
  _id: string;
  url: string;
  public_id: string;
};

type RequestType = {
  _id: string;
  title: string;
  images?: ImageType[];
};

export default function RequestImages({ request, setRequest }: { request: RequestType, setRequest: any }) {
  const { apiFetch } = useApi();
  const [uploading, setUploading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  // 🔹 Ajouter des images
  const addImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    try {
      setUploading(true);

      const formData = new FormData();
      result.assets.forEach((img, index) => {
        const uriParts = img.uri.split(".");
        const fileType = uriParts[uriParts.length - 1];
        formData.append("images", {
          uri: img.uri,
          name: `photo_${Date.now()}_${index}.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      });

      const updated = await apiFetch(`/requests/${request._id}/images`, {
        method: "POST",
        body: formData,
      });

setRequest((prev: any) =>
  prev
    ? {
        ...prev,
        images: updated.images,
      }
    : prev
);
    } catch (err) {
      console.log("Erreur ajout images:", err);
      Alert.alert("Erreur", "Impossible d'ajouter les images");
    } finally {
      setUploading(false);
    }
  };

  // 🔹 Supprimer une image
  const deleteImage = async (imageId: string) => {
    try {
      setUploading(true);
      const updated = await apiFetch(`/requests/${request._id}/images/${imageId}`, {
        method: "DELETE",
      });
      setRequest((prev: any) => prev ? { ...prev, images: updated.images } : prev);
    } catch (err) {
      console.log("Erreur suppression image:", err);
      Alert.alert("Erreur", "Impossible de supprimer l'image");
    } finally {
      setUploading(false);
    }
  };

  // 🔹 Confirmation avant suppression
  const confirmDeleteImage = (imageId: string) => {
    Alert.alert(
      "Supprimer l'image",
      "Êtes-vous sûr de vouloir supprimer cette image ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => deleteImage(imageId) }
      ],
      { cancelable: true }
    );
  };

  // 🔹 Ouvrir preview
  const openPreview = (url: string) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  };

  return (
    <View style={{ marginVertical: 20, flex: 1, gap: 20, backgroundColor: "#1a5b4f", padding: 20, borderRadius: 20, alignItems: "center" }}>

      {uploading && (
        <View style={{ marginVertical: 10 }}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={{ textAlign: "center", fontFamily: "Londrina", color: "white" }}>Chargement...</Text>
        </View>
      )}

      <FlatList
        horizontal
        data={request.images || []}
        keyExtractor={(item) => item.public_id || item._id}
        renderItem={({ item }) => (
          <View style={{ margin: 5 }}>
            <TouchableOpacity onPress={() => openPreview(item.url)}>
              <Image source={{ uri: item.url }} style={styles.image} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => confirmDeleteImage(item._id)}
              style={styles.deleteButton}
            >
              <Image source={trash} style={{height: 20, width: 20}}/>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity onPress={addImages} style={styles.uploadButton}>
        <Text style={{color: "#1a5b4f", fontFamily: "Mont"}}>+ Ajouter des images</Text>
      </TouchableOpacity>

      {/* Modal preview */}
      <Modal visible={previewVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPress={() => setPreviewVisible(false)}
        >
          <Image source={{ uri: previewImage }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setPreviewVisible(false)}
          >
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  image: { width: 150, height: 150, borderRadius: 8, resizeMode: "cover" },
  uploadButton: { backgroundColor: "#d4d4d4", padding: 10, borderRadius: 16, alignItems: "center", width: 260 },
  deleteButton: { position: "absolute", top: 5, right: 5, backgroundColor: "white", padding: 4, borderRadius: 10 },
  modalBackground: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  previewImage: { width: "90%", height: "80%", resizeMode: "contain", borderRadius: 12 },
  closeButton: { position: "absolute", top: 40, right: 20, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 20, height: 34, width: 34, alignItems: "center", justifyContent: "center" },
  closeButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});