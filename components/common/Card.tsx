import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '@/constants/spacing';
import { haptics } from '@/services/haptics';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'subdued' | 'highlight';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
}) => {
  const { theme, isDark } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'elevated':
        return theme.surfaceElevated;
      case 'subdued':
        return theme.surfaceSubdued;
      case 'highlight':
        return isDark ? '#143823' : theme.primaryMuted;
      case 'default':
      default:
        return theme.surface;
    }
  };

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: theme.border,
        },
        variant === 'elevated' ? Shadows.card : Shadows.subtle,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={async () => {
          await haptics.selection();
          onPress();
        }}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.cardPadding,
    borderWidth: 1,
  },
});
