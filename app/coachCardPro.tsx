import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import modifier from "../assets/icons/modifier.png";
import ScoreRing from "./scoreRing";

type CoachAction = {
    type: string;
    requestId?: string;
    label: string;
};

type Strength = {
  icon: string;
  title: string;
  description: string;
};

type Improvement = {
    priority: number;
    icon: string;
    title: string;
    description: string;
    action?: CoachAction;
};

type Coach = {
    score: number;
    level: string;
    title: string;
    subtitle: string;

    strengths: Strength[];

    improvements: Improvement[];

    action?: CoachAction;
};




type Props = {
    coach: Coach;
    firstName: string;
    avatar: string;

    onAction?: (action: CoachAction) => void;
};

export default function CoachCardPro({

    coach,
    firstName,
    avatar,
    onAction

}: Props) {

    const progressColor =
        coach.score >= 90
            ? "#23c34b"
            : coach.score >= 75
                ? "#1aa425"
                : coach.score >= 60
                    ? "#FFB800"
                    : "#FF6B6B";

    const router = useRouter();

    const opacity = useRef(new Animated.Value(1)).current;

    const [currentTip, setCurrentTip] = useState(0);

    const translateX = useRef(new Animated.Value(0)).current;

    const [currentStrength, setCurrentStrength] = useState(0);

const strengthOpacity = useRef(new Animated.Value(1)).current;
const strengthTranslateX = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (coach.strengths.length <= 1) return;

  const interval = setInterval(() => {
    Animated.parallel([
      Animated.timing(strengthOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(strengthTranslateX, {
        toValue: -10,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStrength(
        prev => (prev + 1) % coach.strengths.length
      );

      strengthTranslateX.setValue(10);

      Animated.parallel([
        Animated.timing(strengthOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(strengthTranslateX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, 4000);

  return () => clearInterval(interval);
}, [coach.strengths]);

const strength =
  coach.strengths.length > 0
    ? coach.strengths[currentStrength]
    : null;




    useEffect(() => {

        if (coach.improvements.length <= 1)
            return;

        const interval = setInterval(() => {

            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(translateX, {
                    toValue: -10,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start(() => {

                setCurrentTip(prev => (prev + 1) % coach.improvements.length);

                translateX.setValue(10);

                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(translateX, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start();

            });

        }, 4000);

        return () => clearInterval(interval);

    }, [coach.improvements]);

    const tip = coach.improvements[currentTip];


    return (

        <LinearGradient
            colors={["#30a590", "#1a5b4f"]}
            style={styles.container}

        >

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.header}>
                    Bonjour {firstName}
                </Text>
                <Image source={{ uri: avatar }} style={{ width: 70, height: 70, borderRadius: 35, marginRight: 5 }} />
                <TouchableOpacity
                    onPress={() => router.push({ pathname: "/profilePro" })}
                    style={styles.profileButton}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Modifier profl"
                    accessibilityHint={`Modifier mon profil`}
                >
                    <Image source={modifier} style={{ width: 20, height: 20 }} />
                </TouchableOpacity>
            </View>

            <View style={styles.scoreRow}>

                <View style={{ alignItems: "center", gap: 5 }}>
                    <ScoreRing
                        score={coach.score}
                        color={progressColor}
                    />
                    <Text style={styles.level}>
                        {coach.level}
                    </Text>
                </View>

                <View style={{ flex: 1 }}>


                    <Text style={styles.title}>
                        {coach.title}
                    </Text>

                    <Text style={styles.subtitle}>
                        {coach.subtitle}
                    </Text>

                </View>

            </View>

            {coach.strengths.length > 0 && (

                <View style={styles.section}>

                    

                    {coach.strengths.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>
      Ce qui est déjà bien
    </Text>

    <Animated.View
      style={[
        styles.tipCard,
        {
          opacity: strengthOpacity,
          transform: [{ translateX: strengthTranslateX }],
        },
      ]}
    >
      <Text style={styles.tipIcon}>
        {strength?.icon}
      </Text>

      <View style={{ flex: 1 }}>
        <Text style={styles.tipTitle}>
          {strength?.title}
        </Text>

        <Text style={styles.tipDescription}>
          {strength?.description}
        </Text>
      </View>
    </Animated.View>

    <View style={styles.pagination}>
      {coach.strengths.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentStrength && styles.activeDot,
          ]}
        />
      ))}
    </View>
  </View>
)}

                </View>

            )}

            {coach.improvements.length > 0 && (

                <View style={styles.section}>

                    <Text style={styles.sectionTitle}>

                        À améliorer

                    </Text>


                    <Animated.View
                        style={[
                            styles.tipCard,
                            {
                                opacity,
                                transform: [{ translateX }],
                            },
                        ]}
                    >

                        <Text style={styles.tipIcon}>
                            {tip.icon}
                        </Text>

                        <View style={{ flex: 1 }}>
                            <Text style={styles.tipTitle}>
                                {tip.title}
                            </Text>
                            <Text style={styles.tipDescription}>
                                {tip.description}
                            </Text>
                        </View>
                    </Animated.View>

                    <View style={styles.pagination}>
                        {coach.improvements.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    index === currentTip && styles.activeDot,
                                ]}
                            />
                        ))}
                    </View>

                </View>

            )}

            <View style={styles.actionContainer}>

    {tip?.action ? (

        <TouchableOpacity
            style={styles.button}
            onPress={() => onAction?.(tip.action!)}
            activeOpacity={0.8}
        >
            <Text style={styles.buttonText}>
                {tip.action.label}
            </Text>
        </TouchableOpacity>

    ) : (

        <View style={styles.buttonPlaceholder} />

    )}

</View>

        </LinearGradient>

    );

}

const styles = StyleSheet.create({

    container: {
        width: "94%",
        borderRadius: 30,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 18,
        shadowOffset: {
            width: 0,
            height: 8
        },
        elevation: 10,
        
    },

    header: {
        color: "#fff",
        fontFamily: "Montt",
        fontSize: 20,
        marginBottom: 22,
        width: "70%",
    },

    scoreRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 25,
        gap: 10
    },

    score: {
        color: "#fff",
        fontFamily: "Montt",
        fontSize: 30
    },

    over100: {
        color: "rgba(255,255,255,0.8)",
        fontFamily: "Mont",
        fontSize: 13
    },

    level: {
        color: "#E6FFF8",
        fontFamily: "Montt",
        fontSize: 15,
        marginBottom: 4
    },

    title: {
        color: "#fff",
        fontFamily: "Montt",
        fontSize: 18
    },

    subtitle: {
        color: "rgba(255,255,255,0.9)",
        fontFamily: "Mont",
        marginTop: 6,
        lineHeight: 20
    },

    section: {
        marginTop: 10
    },

    sectionTitle: {
        color: "#fff",
        fontFamily: "Montt",
        fontSize: 16,
        marginBottom: 10,
    },

    goodItem: {
        color: "#E8FFF8",
        fontFamily: "Mont",
        fontSize: 14,
        marginBottom: 8,
        lineHeight: 22,
    },

    badItem: {

        color: "#FFE6B0",

        fontFamily: "Mont",

        marginBottom: 7,

        fontSize: 14

    },

    button: {
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 25,
        height: 48,
    },

    buttonText: {
        color: "#1a5b4f",
        fontFamily: "Montt",
        fontSize: 15,
    },
    profileButton: { padding: 4, borderRadius: 50, backgroundColor: "#999999", position: "absolute", bottom: -4, right: 1, borderColor: "#f5f5f5", borderWidth: 1 },

    tipCard: {
        marginTop: 6,
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 18,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: 95,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
        height: 140
    },

    tipIcon: {
        fontSize: 34,
        width: 48,
        textAlign: "center",
    },

    tipTitle: {
        color: "#fff",
        fontFamily: "Montt",
        fontSize: 17,
        marginBottom: 5,
    },

    tipDescription: {
        color: "rgba(255,255,255,0.88)",
        fontFamily: "Mont",
        fontSize: 14,
        lineHeight: 20,
    },
    pagination: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 14,
        gap: 8,
    },

    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    activeDot: {
        width: 18,
        backgroundColor: "#fff",
        transform: [{ scale: 1.1 }],
    },
    actionContainer: {
    height: 66,
    marginTop: 0,
    justifyContent: "flex-end",
},
    buttonPlaceholder: {
    height: 48,
    opacity: 0,
},
});