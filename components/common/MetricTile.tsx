import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  style?: ViewStyle;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  subtext,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text style={[Typography.headingLarge, { color: theme.textPrimary }]}>
          {value}
        </Text>
        {unit ? (
          <Text
            style={[
              Typography.caption,
              { color: theme.textSecondary, marginLeft: 4, marginBottom: 2 },
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>
      {subtext ? (
        <Text style={[Typography.caption, { color: theme.textMuted, marginTop: 2 }]}>
          {subtext}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 2,
  },
});
