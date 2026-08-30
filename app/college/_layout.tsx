import { Stack } from 'expo-router';

export default function CollegeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="study-timer" options={{ headerShown: false }} />
    </Stack>
  );
}
