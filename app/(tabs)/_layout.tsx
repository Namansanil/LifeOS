import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/typography';
import { BorderRadius, Spacing, Shadows } from '@/constants/spacing';
import {
  Sun,
  Footprints,
  FolderGit2,
  BarChart3,
  User,
  Plus,
} from 'lucide-react-native';
import { haptics } from '@/services/haptics';
import { QuickAddSheet } from '@/components/common/QuickAddSheet';

export default function TabsLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.divider,
            borderTopWidth: 1,
            height: 60 + bottomInset,
            paddingBottom: bottomInset,
            paddingTop: 6,
            ...Shadows.card,
          },
          tabBarLabelStyle: {
            ...Typography.eyebrowSmall,
            fontSize: 9,
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'TODAY',
            tabBarIcon: ({ color, focused }) => (
              <Sun size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            ),
          }}
        />

        <Tabs.Screen
          name="activities"
          options={{
            title: 'ACTIVITIES',
            tabBarIcon: ({ color, focused }) => (
              <Footprints size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            ),
          }}
        />

        <Tabs.Screen
          name="projects"
          options={{
            title: 'PROJECTS',
            tabBarIcon: ({ color, focused }) => (
              <FolderGit2 size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            ),
          }}
        />

        <Tabs.Screen
          name="progress"
          options={{
            title: 'PROGRESS',
            tabBarIcon: ({ color, focused }) => (
              <BarChart3 size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'PROFILE',
            tabBarIcon: ({ color, focused }) => (
              <User size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            ),
          }}
        />
      </Tabs>

      {/* Floating Quick Action Button */}
      <View
        style={[
          styles.fabContainer,
          { bottom: bottomInset + 56 },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          accessibilityLabel="Quick Action"
          accessibilityRole="button"
          onPress={async () => {
            await haptics.medium();
            setQuickAddVisible(true);
          }}
          style={({ pressed }) => [
            styles.fabButton,
            {
              backgroundColor: theme.primary,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
            Shadows.floating,
          ]}
        >
          <Plus size={26} color={theme.primaryForeground} strokeWidth={2.8} />
        </Pressable>
      </View>

      <QuickAddSheet
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: Spacing.screenHorizontal,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
