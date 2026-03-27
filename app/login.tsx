import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
      const res = await fetch('http://192.168.1.11:5000/api/auth/login', {
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
      await login({ token: data.token, role: data.role });

      // Redirection selon le rôle
      router.replace(data.role === 'pro' ? '/homePro' : '/homeClient');

    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Connexion {role === 'pro' ? 'Professionnel' : 'Particulier'}
      </Text>
      <Text style={styles.subtitle}>
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
      />

      <TextInput
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        editable={!loading}
      />

      <View style={{ marginVertical: 10 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <TouchableOpacity onPress={handleLogin} style={{backgroundColor: "#007AFF", padding: 10, borderRadius: 12, marginBlock: 10}} >
            <Text style={{color: "#fff", fontFamily: "Mont", fontSize: 16}}>Se connecter</Text>
          </TouchableOpacity>
        )}
      </View>

      {!loading && (
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/register', params: { role } })}
        >
          <Text style={{color: "#007AFF", fontFamily: "Mont" }}>Créer un compte</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, alignItems: "center" },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center', fontFamily: "Montt" },
  subtitle : {fontSize: 16, textAlign: "center", marginBottom: 20, fontFamily: "Montt"},
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 15,
    borderRadius: 6,
    width: 300, fontFamily: "Mont"
  },
});