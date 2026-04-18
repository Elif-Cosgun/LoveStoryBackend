import { Stack } from "expo-router";
import { LogBox } from "react-native";

LogBox.ignoreAllLogs();

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="game" options={{ headerShown: false }} />
    </Stack>
  );
}
