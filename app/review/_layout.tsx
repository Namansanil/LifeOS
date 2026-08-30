import { Stack } from 'expo-router';

export default function ReviewLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="daily" options={{ headerShown: false }} />
    </Stack>
  );
}
