import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

const tips = [
  {
    icon: "📷",
    title: "Astuce",
    text: "Ajoutez au moins une photo.\nLes artisans comprennent plus vite votre besoin.",
  },
  {
    icon: "💰",
    title: "Astuce",
    text: "Indiquez un budget.\nLes professionnels répondent plus rapidement.",
  },
  {
    icon: "📝",
    title: "Astuce",
    text: "Décrivez précisément votre projet.\nVous recevrez des propositions plus adaptées.",
  },
  {
    icon: "📅",
    title: "Conseil",
    text: "Indiquez vos disponibilités.\nCela facilite la prise de rendez-vous.",
  },
  {
    icon: "📍",
    title: "Conseil",
    text: "Vérifiez votre localisation.\nLes artisans proches vous trouveront plus facilement.",
  },
];

export default function TipsCarousel() {
  const [index, setIndex] = useState(0);

  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setIndex((prev) => (prev + 1) % tips.length);

        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const tip = tips[index];

  return (
    <Animated.View
      style={{
        opacity,
        width: "90%",
        marginBottom: 22,
      }}
    >
      <LinearGradient
        colors={["#38b79f", "#1a5b4f"]}
        style={styles.card}
      >
        <Text style={styles.title}>
          {tip.icon} {tip.title}
        </Text>

        <Text style={styles.text}>
          {tip.text}
        </Text>

        <View style={styles.dots}>
          {tips.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                index === i && styles.activeDot,
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
  },

  title: {
    color: "white",
    fontFamily: "Montt",
    fontSize: 16,
    marginBottom: 8,
  },

  text: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: "Mont",
    fontSize: 14,
    lineHeight: 21,
  },

  dots: {
    flexDirection: "row",
    alignSelf: "center",
    marginTop: 15,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginHorizontal: 4,
  },

  activeDot: {
    width: 18,
    backgroundColor: "#fff",
  },
});