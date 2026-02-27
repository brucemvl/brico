import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableWithoutFeedback
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();
  const context = useContext(AuthContext);

  if (!context) throw new Error('AuthContext non fourni');
  const { user, loading } = context;

  // Redirection auto
  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === 'pro' ? '/homePro' : '/homeClient');
    }
  }, [user, loading]);

  // Animation d'entrée
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const createButtonAnim = () => {
    const scale = new Animated.Value(1);

    const onPressIn = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.spring(scale, {
        toValue: 1.2,
        useNativeDriver: true,
      }).start();
    };

    const onPressOut = () => {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return { scale, onPressIn, onPressOut };
  };

  const clientAnim = useRef(createButtonAnim()).current;
  const proAnim = useRef(createButtonAnim()).current;

  if (loading) return null;

  return (
    <LinearGradient
      colors={[ '#2C5364', '#203A43', '#0F2027']}
      style={styles.gradient}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.title}>BricoConnect</Text>
        <Text style={styles.subtitle}>
          Trouvez le bon professionnel en quelques secondes.
        </Text>

        {/* Bouton Client */}
        <TouchableWithoutFeedback
          onPress={() =>
            router.push({ pathname: '/login', params: { role: 'client' } })
          }
          onPressIn={clientAnim.onPressIn}
          onPressOut={clientAnim.onPressOut}
        >
          <Animated.View
            style={[
              styles.buttonWrapper,
              { transform: [{ scale: clientAnim.scale }] },
            ]}
          >
            <LinearGradient
              colors={['#007AFF', '#0051FF']}
              style={styles.button}
            >
<Text style={styles.buttonTitle}>Besoin d’un artisan</Text>

            </LinearGradient>
          </Animated.View>
        </TouchableWithoutFeedback>

        {/* Bouton Pro */}
        <TouchableWithoutFeedback
          onPress={() =>
            router.push({ pathname: '/login', params: { role: 'pro' } })
          }
          onPressIn={proAnim.onPressIn}
          onPressOut={proAnim.onPressOut}
        >
          <Animated.View
            style={[
              styles.buttonWrapper,
              { transform: [{ scale: proAnim.scale }] },
            ]}
          >
            <LinearGradient
              colors={['#34C759', '#0BA360']}
              style={styles.button}
            >
<Text style={styles.buttonTitle}>Je propose mes services</Text>

            </LinearGradient>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: width * 0.85,
    alignItems: 'center',
  },
  title: {
    fontSize: 38,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 50,
    fontSize: 16,
  },
  buttonWrapper: {
    width: 240,
    marginBottom: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonTitle: {
  color: 'white',
  fontSize: 16,
  fontWeight: '700',
},

buttonSubtitle: {
  color: 'rgba(255,255,255,0.85)',
  fontSize: 12,
  marginTop: 4,
  textAlign: 'center',
},
});