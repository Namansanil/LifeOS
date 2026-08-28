import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { haptics } from '@/services/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const { theme, isDark } = useTheme();

  const handlePress = async () => {
    if (disabled || loading) return;
    await haptics.light();
    onPress();
  };

  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) return isDark ? '#232833' : '#E5E0D6';
    switch (variant) {
      case 'primary':
        return pressed ? (isDark ? '#36B368' : '#142C20') : theme.primary;
      case 'secondary':
        return pressed ? '#14232E' : theme.navy;
      case 'outline':
        return pressed ? (isDark ? '#222834' : theme.surfaceSubdued) : 'transparent';
      case 'ghost':
        return pressed ? (isDark ? '#222834' : theme.surfaceSubdued) : 'transparent';
      case 'danger':
        return pressed ? '#8E1414' : '#BA1A1A';
      default:
        return theme.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.textMuted;
    switch (variant) {
      case 'primary':
        return theme.primaryForeground;
      case 'secondary':
        return theme.navyForeground;
      case 'outline':
      case 'ghost':
        return theme.textPrimary;
      case 'danger':
        return '#FFFFFF';
      default:
        return theme.primaryForeground;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 8, paddingHorizontal: 14 };
      case 'large':
        return { paddingVertical: 16, paddingHorizontal: 24 };
      case 'medium':
      default:
        return { paddingVertical: 12, paddingHorizontal: 18 };
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        getPadding(),
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor:
            variant === 'outline' ? theme.border : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text
            style={[
              size === 'small' ? Typography.labelMedium : Typography.labelBold,
              { color: getTextColor(), textAlign: 'center' },
              icon ? { marginLeft: Spacing.sm } : null,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    minHeight: 44, // 44x44 minimum touch target
  },
});
