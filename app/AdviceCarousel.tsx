import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    View,
} from "react-native";

const { width } = Dimensions.get("window");

const CARD_WIDTH = width - 50;

export type Advice = {
  icon: string;
  title: string;
  text: string;
};

type Props = {
  advices: Advice[];
};

export default function AdviceCarousel({ advices }: Props) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<any>(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (advices.length <= 1) return;

    const interval = setInterval(() => {
      const next =
        currentIndex === advices.length - 1
          ? 0
          : currentIndex + 1;

      flatListRef.current?.scrollToIndex({
        index: next,
        animated: true,
      });

      setCurrentIndex(next);
    }, 4500);

    return () => clearInterval(interval);
  }, [currentIndex, advices]);

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={advices}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH}
        snapToAlignment="center"
        contentContainerStyle={{
          paddingHorizontal: 25,
        }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / CARD_WIDTH
          );

          setCurrentIndex(index);
        }}
        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: {
                  x: scrollX,
                },
              },
            },
          ],
          {
            useNativeDriver: false,
          }
        )}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * CARD_WIDTH,
            index * CARD_WIDTH,
            (index + 1) * CARD_WIDTH,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.92, 1, 0.92],
            extrapolate: "clamp",
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.65, 1, 0.65],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              style={[
                styles.cardWrapper,
                {
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            >
              <LinearGradient
                colors={["#33b89e", "#1a5b4f"]}
                style={styles.card}
              >
                <Text style={styles.icon}>
                  {item.icon}
                </Text>

                <Text style={styles.title}>
                  {item.title}
                </Text>

                <Text style={styles.text}>
                  {item.text}
                </Text>
              </LinearGradient>
            </Animated.View>
          );
        }}
      />

      <View style={styles.pagination}>
        {advices.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index &&
                styles.activeDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 18,
  },

  cardWrapper: {
    width: CARD_WIDTH,
    paddingHorizontal: 5,
  },

  card: {
    borderRadius: 24,
    padding: 24,
    minHeight: 165,

    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 8,
  },

  icon: {
    fontSize: 42,
    marginBottom: 10,
  },

  title: {
    color: "white",
    fontFamily: "Montt",
    fontSize: 19,
    marginBottom: 8,
  },

  text: {
    color: "rgba(255,255,255,0.95)",
    fontFamily: "Mont",
    fontSize: 14,
    lineHeight: 22,
  },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
    backgroundColor: "#cfcfcf",
  },

  activeDot: {
    width: 22,
    backgroundColor: "#1a5b4f",
  },
});