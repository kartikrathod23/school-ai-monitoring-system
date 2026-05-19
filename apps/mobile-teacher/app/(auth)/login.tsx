import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text } from "react-native";

export default function LoginScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center bg-red-500">
        <Text className="text-white text-4xl font-bold">
          Teacher Login
        </Text>
      </View>
    </SafeAreaView>
  );
}