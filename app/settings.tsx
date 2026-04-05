import BackButton from '@/components/BackButton';
import * as Haptics from 'expo-haptics';
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import fond from "../assets/convert_1.png";
import { useApi } from "../services/api";

type NotificationPrefs = {
  message: boolean;
  deal: boolean;
  request: boolean;
  review: boolean;
};

type NotificationType = keyof NotificationPrefs;

export default function SettingsScreen() {
  const { apiFetch } = useApi();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [notifications, setNotifications] = useState<NotificationPrefs>({
  message: true,
  deal: true,
  request: true,
  review: true
});

  const [loading, setLoading] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

useEffect(() => {
  const loadPrefs = async () => {
    try {
      const data = await apiFetch("/users/me");
      if (data.notificationPreferences) {
        setNotifications(data.notificationPreferences);
      }
    } catch {}
  };

  loadPrefs();
}, []);

const updateNotifications = async (newPrefs: NotificationPrefs) => {
    try {
    await apiFetch("/notifications/me/notifications", {
      method: "PUT",
      body: JSON.stringify(newPrefs)
    });

    setNotifications(newPrefs); // ✅ après succès
  } catch (err) {
    Alert.alert("Erreur", "Impossible de mettre à jour");
  }
};

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const validatePassword = (password) => {
    return /^(?=.*[A-Z])(?=.*\d).{6,}$/.test(password);
  };

  const handleChangeEmail = async () => {
    if (!validateEmail(email)) {
      return Alert.alert("Erreur", "Email invalide");
    }

    try {
      setLoading(true);

      await apiFetch("/users/me/email", {
        method: "PUT",
        body: JSON.stringify({ email })
      });

      Alert.alert("Succès", "Email mis à jour");
      setEmail("");
    } catch (err: any) {
      Alert.alert("Erreur", err?.error || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword(newPassword)) {
      return Alert.alert(
        "Erreur",
        "Mot de passe: 6 caractères, 1 majuscule, 1 chiffre"
      );
    }

    if (newPassword !== confirmPassword) {
      return Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
    }

    try {
      setLoading(true);

      await apiFetch("/users/me/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword })
      });

      Alert.alert("Succès", "Mot de passe mis à jour");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Alert.alert("Erreur", err?.error || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Confirmation",
      "Supprimer définitivement votre compte ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch("/users/me", {
                method: "DELETE"
              });

              Alert.alert("Compte supprimé");
              router.replace("/");
            } catch {
              Alert.alert("Erreur", "Suppression impossible");
            }
          }
        }
      ]
    );
  };

  return (
    <ImageBackground source={fond} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <BackButton />

        <View style={styles.container}>
          <Text style={styles.title}>Paramètres</Text>

          <View style={styles.box}>
  <Text style={styles.label}>Notifications</Text>

{(["message", "deal", "request", "review"] as NotificationType[]).map((type) => (
      <View key={type} style={styles.row}>
      <Text style={{ color: "white", fontFamily: "Mont" }}>
  {{
    message: "Messages",
    deal: "Propositions",
    request: "Nouvelles demandes",
    review: "Avis"
  }[type]}
</Text>

      <Switch
        value={notifications[type]}
        onValueChange={(value) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateNotifications({ ...notifications, [type]: value })
        }
        }
      />
    </View>
  ))}
</View>

          {/* EMAIL */}
          <View style={styles.box}>
            <Text style={styles.label}>Changer Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Nouvel email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.button} onPress={handleChangeEmail}>
              <Text style={styles.buttonText}>Mettre à jour</Text>
            </TouchableOpacity>
          </View>

          {/* PASSWORD */}
          <View style={styles.box}>
            <Text style={styles.label}>Mot de passe</Text>

            <TextInput
              style={styles.input}
              placeholder="Mot de passe actuel"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <TextInput
              style={styles.input}
              placeholder="Nouveau mot de passe"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirmer mot de passe"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
              <Text style={styles.buttonText}>Changer</Text>
            </TouchableOpacity>
          </View>

          {/* DELETE */}
          <TouchableWithoutFeedback
            onPress={handleDeleteAccount}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
          >
            <Animated.View style={[styles.deleteButton, { transform: [{ scale: scaleAnim }] }]}>
              <Text style={styles.deleteText}>Supprimer mon compte</Text>
            </Animated.View>
          </TouchableWithoutFeedback>

          {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    gap: 20
  },
  title: {
    fontSize: 24,
    fontFamily: "Montt",
    textAlign: "center"
  },
  box: {
    backgroundColor: "#247868",
    padding: 15,
    borderRadius: 20
  },
  label: {
    color: "white",
    marginBottom: 10,
    fontFamily: "Mont"
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    fontFamily: "Mont"
  },
  button: {
    backgroundColor: "#72ca66",
    padding: 10,
    borderRadius: 20,
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontFamily: "Mont"
  },
  deleteButton: {
    backgroundColor: "#c03939",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  deleteText: {
    color: "white",
    fontFamily: "Montt"
  },
  row: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10
}
});
