import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import logo from "../assets/briconnect3.png";
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const router = useRouter();
  const { role } = useLocalSearchParams(); // "client" ou "pro"
  const context = useContext(AuthContext);

  if (!context) throw new Error("AuthContext non fourni");
  const { login } = context;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Erreur', 'Veuillez remplir tous les champs');
    }

    setLoading(true);

    try {
      const res = await fetch('https://brico-8fih.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Erreur', data.message || 'Impossible de se connecter');
        setLoading(false);
        return;
      }

      // Stocke le token et le rôle dans le contexte et AsyncStorage
      await login({
        token: data.token,
        role: data.role,
        userId: data.userId,
        onboardingCompleted: data.onboardingCompleted
      });

      // Redirection selon le rôle
      if (data.role === "pro") {
        if (!data.onboardingCompleted) {
          router.replace("/onboardingPro");
        } else {
          router.replace("/homePro");
        }
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
    <View style={styles.container}>
      <Image source={logo} style={{ height: 180, width: 180, backgroundColor: "#fff", borderRadius: 90 }} />

      <Text style={styles.title} accessibilityRole="header">
        Connexion {role === 'pro' ? 'Professionnel' : 'Particulier'}
      </Text>
      <Text style={styles.subtitle} accessible
        accessibilityRole="text">
        {role === 'pro' ? 'Rejoignez la plateforme et recevez des missions' : 'Trouvez rapidement un bricoleur qualifié'}
      </Text>

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
        accessibilityHint="Entrer votre email pour vous connecter"
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
        accessibilityHint="Entrer votre mot de passe"
      />

      <View style={{ marginVertical: 10 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <TouchableOpacity onPress={handleLogin}
            style={{ backgroundColor: "#007AFF", padding: 10, borderRadius: 12, marginBlock: 10 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Se connecter"
            accessibilityHint="Valider vos identifiants pour accéder à votre compte" >
            <Text style={{ color: "#fff", fontFamily: "Mont", fontSize: 16 }}>Se connecter</Text>
          </TouchableOpacity>
        )}
      </View>

      {!loading && (
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/register', params: { role } })}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Créer un compte"
          accessibilityHint="Aller à la page d'inscription"
        >
          <Text style={{ color: "#007AFF", fontFamily: "Mont" }}>Créer un compte</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center', fontFamily: "Montt", color: "#1a5b4f" },
  subtitle: { fontSize: 16, textAlign: "center", marginBottom: 20, fontFamily: "Montt", color: "#1a5b4f" },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 15,
    borderRadius: 6,
    width: 300, fontFamily: "Mont"
  },
});