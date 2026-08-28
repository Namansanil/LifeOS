import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { User, Bell, Settings } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

interface AppHeaderProps {
  date?: string;
  greeting?: string;
  title?: string;
  subtitle?: string;
  showProfile?: boolean;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  date,
  greeting,
  title,
  subtitle,
  showProfile = true,
  rightAction,
}) => {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { borderBottomColor: theme.divider }]}>
      <View style={styles.leftColumn}>
        {date ? (
          <Text style={[Typography.eyebrow, { color: theme.textMuted }]}>
            {date}
          </Text>
        ) : null}
        {greeting ? (
          <Text style={[Typography.eyebrow, { color: theme.primary, marginTop: 2 }]}>
            {greeting}
          </Text>
        ) : null}
        {title ? (
          <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightActions}>
        {rightAction}
        {showProfile && (
          <Pressable
            accessibilityLabel="Open Profile and Settings"
            style={({ pressed }) => [
              styles.avatarButton,
              {
                backgroundColor: isDark ? theme.surfaceElevated : theme.surfaceSubdued,
                borderColor: theme.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            onPress={async () => {
              await haptics.selection();
              router.push('/(tabs)/profile');
            }}
          >
            <User size={18} color={theme.textPrimary} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  leftColumn: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
