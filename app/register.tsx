import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function Register() {
  const router = useRouter();
  const { role } = useLocalSearchParams(); // récupère "client" ou "pro"
  const context = useContext(AuthContext);

  if (!context) throw new Error("AuthContext non fourni");

  const { login } = context;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      return Alert.alert('Erreur', 'Veuillez remplir tous les champs');
    }

    setLoading(true);

    try {
      const res = await fetch('https://brico-8fih.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Erreur', data.message || 'Impossible de créer le compte');
        setLoading(false);
        return;
      }

      // stocke le token et le role dans le contexte et AsyncStorage
      await login({
  token: data.token,
  role: data.role,
  userId: data.userId,
  onboardingCompleted: false
});

      // redirection selon le rôle
     if (data.role === "pro") {
  router.replace("/onboardingPro");
} else {
  router.replace("/homeClient");
}

    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container} accessible
  accessibilityLabel="Écran de création de compte">
      <Text style={styles.title} accessibilityRole="header">
        Créer un compte {role === 'pro' ? 'Professionnel' : 'Particulier'}
      </Text>

      <TextInput
        placeholder="Nom complet"
        value={name}
        onChangeText={setName}
        style={styles.input}
        editable={!loading}
         accessible
  accessibilityLabel="Nom"
  accessibilityHint="Entrer votre nom"
      />

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        editable={!loading}
        accessible
  accessibilityLabel="Adresse email"
  accessibilityHint="Entrer votre email pour créer le compte"
      />

      <TextInput
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        editable={!loading}
        accessible
  accessibilityLabel="Mot de passe"
  accessibilityHint="Créer un mot de passe sécurisé"
      />

      <View style={{ marginVertical: 10 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <TouchableOpacity 
          onPress={handleRegister} 
          style={{backgroundColor: "#007AFF", padding: 10, borderRadius: 12, marginBlock: 10}}
          accessible
  accessibilityRole="button"
  accessibilityLabel="Créer mon compte"
  accessibilityHint="Valider l'inscription et créer votre compte" >
            <Text style={{color: "#fff", fontFamily: "Mont", fontSize: 16}}>Créer mon compte</Text>
          </TouchableOpacity>
        )}
      </View>

      {!loading && (
        <TouchableOpacity
          
          onPress={() => router.push({ pathname: '/login', params: { role } })}
          accessible
  accessibilityRole="button"
  accessibilityLabel="Déjà un compte, se connecter"
  accessibilityHint="Retourner à l'écran de connexion"
        >
          <Text style={{color: "#007AFF", fontFamily: "Mont" }}>Déjà un compte ? Se connecter</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, alignItems: "center", },
  title: { fontSize: 20, marginBottom: 20, fontFamily: "Montt", textAlign: 'center', color: "#1a5b4f" },
  input: {
    borderWidth: 1,
    paddingInline: 10,
    height: 40,
    marginBottom: 15,
    borderRadius: 6,
    fontFamily: "Mont",
    width: 300,
    borderColor: "#1a5b4f"
  },
});