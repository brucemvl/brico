import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
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
      const res = await fetch('http://192.168.1.11:5000/api/auth/register', {
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
      await login({ token: data.token, role: data.role });

      // redirection selon le rôle
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
        Créer un compte {role === 'pro' ? 'Professionnel' : 'Particulier'}
      </Text>

      <TextInput
        placeholder="Nom complet"
        value={name}
        onChangeText={setName}
        style={styles.input}
        editable={!loading}
      />

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
          <Button title="Créer mon compte" onPress={handleRegister} />
        )}
      </View>

      {!loading && (
        <Button
          title="Déjà un compte ? Se connecter"
          onPress={() => router.push({ pathname: '/login', params: { role } })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, fontWeight: 'bold', textAlign: 'center' },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 15,
    borderRadius: 6,
  },
});