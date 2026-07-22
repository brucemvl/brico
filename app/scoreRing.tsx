import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 100;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
    score: number;
    color: string;
};

export default function ScoreRing({ score, color }: Props) {

    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {

        Animated.timing(progress, {
            toValue: score,
            duration: 1200,
            useNativeDriver: false
        }).start();

    }, []);

    const strokeDashoffset = progress.interpolate({

        inputRange: [0, 100],

        outputRange: [CIRCUMFERENCE, 0]

    });

    return (

        <View style={styles.container}>

            <Svg
                width={SIZE}
                height={SIZE}
            >

                <Circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    stroke="rgba(255,255,255,.15)"
                    strokeWidth={STROKE}
                    fill="none"
                />

                <AnimatedCircle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    stroke={color}
                    strokeWidth={STROKE}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${CIRCUMFERENCE}`}
                    strokeDashoffset={strokeDashoffset}
                    rotation="-90"
                    origin={`${SIZE / 2}, ${SIZE / 2}`}
                />

            </Svg>

            <View style={styles.center}>

                <Text style={styles.score}>
                    {score}
                </Text>

                <Text style={styles.outOf}>
                    /100
                </Text>

            </View>

        </View>

    );

}

const styles = StyleSheet.create({

    container: {

        width: SIZE,
        height: SIZE,
        justifyContent: "center",
        alignItems: "center"

    },

    center: {

        position: "absolute",
        alignItems: "center"

    },

    score: {

        color: "#fff",
        fontSize: 28,
        fontFamily: "Montt"

    },

    outOf: {

        color: "rgba(255,255,255,.75)",
        fontFamily: "Mont",
        fontSize: 13

    }

});