import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, ViewStyle } from "react-native";

type Props = {
  style?: ViewStyle;
  label?: string;
};

export default function BackButton({ style, label = "Retour" }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={() => router.back()}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={22} color="white" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top: 70,
    left: 15,
    zIndex: 100,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});