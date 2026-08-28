import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { BorderRadius } from '@/constants/spacing';

interface ProgressBarProps {
  progress: number; // 0 to 1 (or 0 to 100)
  height?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  color,
  backgroundColor,
  style,
}) => {
  const { theme } = useTheme();
  const normalized = progress > 1 ? progress / 100 : Math.max(0, progress);

  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withSpring(Math.min(1, Math.max(0, normalized)), {
      damping: 18,
      stiffness: 120,
    });
  }, [normalized]);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: backgroundColor || theme.borderLight,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            backgroundColor: color || theme.primary,
          },
          barAnimatedStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: BorderRadius.full,
  },
});
