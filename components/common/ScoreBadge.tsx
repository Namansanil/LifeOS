import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';

interface ScoreBadgeProps {
  label: string;
  variant?: 'primary' | 'navy' | 'amber' | 'neutral';
  style?: ViewStyle;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  label,
  variant = 'primary',
  style,
}) => {
  const { theme, isDark } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: isDark ? '#143823' : theme.primaryMuted,
          text: theme.primary,
        };
      case 'navy':
        return {
          bg: isDark ? '#172B45' : theme.navyMuted,
          text: theme.navy,
        };
      case 'amber':
        return {
          bg: isDark ? '#3D220E' : theme.amberMuted,
          text: theme.amber,
        };
      case 'neutral':
      default:
        return {
          bg: isDark ? '#232833' : theme.surfaceSubdued,
          text: theme.textSecondary,
        };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[Typography.eyebrowSmall, { color: colors.text }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
});
