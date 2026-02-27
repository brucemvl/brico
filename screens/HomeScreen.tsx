import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Request {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  budget?: number;
  status: string;
}

interface HomeScreenProps {
  userId: string;
  role: 'client' | 'pro';
  token: string;
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ userId, role, token, navigation }) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const url = role === 'pro' ? 'http://localhost:5000/api/requests/available' : `http://localhost:5000/api/requests?userId=${userId}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Request }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text>{item.description}</Text>
      <Text style={styles.info}>Catégorie : {item.category}</Text>
      <Text style={styles.info}>Lieu : {item.location}</Text>
      {item.budget && <Text style={styles.info}>Budget : {item.budget} €</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Bienvenue sur BricoConnect</Text>

      {role === 'client' && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('CreateRequest')}
        >
          <Text style={styles.buttonText}>Créer une nouvelle demande</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          style={{ width: '100%' }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 12,
    borderRadius: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  info: {
    marginTop: 2,
    fontSize: 12,
    color: '#555',
  },
});