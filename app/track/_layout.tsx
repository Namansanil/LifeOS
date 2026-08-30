import { Stack } from 'expo-router';

export default function TrackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="active" options={{ headerShown: false }} />
      <Stack.Screen name="summary" options={{ headerShown: false }} />
    </Stack>
  );
}
