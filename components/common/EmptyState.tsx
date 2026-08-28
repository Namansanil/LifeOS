import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionTitle,
  onAction,
  style,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? theme.surfaceSubdued : theme.surface,
          borderColor: theme.borderLight,
        },
        style,
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: isDark ? '#232833' : theme.surfaceSubdued },
          ]}
        >
          {icon}
        </View>
      ) : null}

      <Text style={[Typography.eyebrow, { color: theme.textPrimary, marginTop: Spacing.sm }]}>
        {title}
      </Text>

      <Text
        style={[
          Typography.bodySmall,
          { color: theme.textSecondary, textAlign: 'center', marginTop: 4 },
        ]}
      >
        {description}
      </Text>

      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          size="small"
          style={{ marginTop: Spacing.md }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
});
