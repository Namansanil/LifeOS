import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useTracking } from '@/hooks/useTracking';
import { useLocation } from '@/hooks/useLocation';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Button } from '@/components/common/Button';
import { ActivityType } from '@/types';
import { ACTIVITY_DEFINITIONS } from '@/constants/activity';
import {
  Footprints,
  Bike,
  Mountain,
  Waves,
  Navigation,
  Activity as ActivityIcon,
  X,
  ShieldCheck,
} from 'lucide-react-native';
import { haptics } from '@/services/haptics';

const SPORT_OPTIONS: { type: ActivityType; label: string; icon: any; desc: string }[] = [
  {
    type: 'RUN',
    label: 'Outdoor Run',
    icon: Footprints,
    desc: 'High accuracy GPS, cadence & splits',
  },
  {
    type: 'CYCLE',
    label: 'Cycling',
    icon: Bike,
    desc: 'Speed, elevation & route polyline',
  },
  {
    type: 'WALK',
    label: 'Outdoor Walk',
    icon: Footprints,
    desc: 'Balanced tracking & moving time',
  },
  {
    type: 'HIKE',
    label: 'Hike / Trail',
    icon: Mountain,
    desc: 'Altitude gain & topographical tracking',
  },
  {
    type: 'SURF',
    label: 'Surf Session',
    icon: Waves,
    desc: 'Ocean track & wave timing',
  },
];

export default function TrackSportSelectorScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { prepare } = useTracking();
  const { permissions, requestForeground } = useLocation();

  const [selectedSport, setSelectedSport] = useState<ActivityType>('RUN');

  const handleStart = async () => {
    const fg = await requestForeground();
    await prepare(selectedSport);
    router.push('/track/active');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.closeBtn,
            { backgroundColor: isDark ? '#232833' : theme.surfaceSubdued, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <X size={20} color={theme.textPrimary} />
        </Pressable>
        <Text style={[Typography.eyebrow, { color: theme.primary }]}>
          GPS ENGINE
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: Spacing.sm }]}>
          Select Activity
        </Text>
        <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 4 }]}>
          Outdoor GPS tracking with route recording and instant performance splits.
        </Text>

        {/* Sport Cards */}
        <View style={styles.sportList}>
          {SPORT_OPTIONS.map((opt) => {
            const isSelected = selectedSport === opt.type;
            const IconComp = opt.icon;
            const meta = ACTIVITY_DEFINITIONS[opt.type];

            return (
              <Pressable
                key={opt.type}
                onPress={async () => {
                  await haptics.selection();
                  setSelectedSport(opt.type);
                }}
                style={({ pressed }) => [
                  styles.sportCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                  Shadows.subtle,
                ]}
              >
                <View
                  style={[
                    styles.sportIcon,
                    {
                      backgroundColor: isSelected
                        ? theme.primary
                        : isDark
                        ? '#232833'
                        : meta.bgColor,
                    },
                  ]}
                >
                  <IconComp
                    size={22}
                    color={isSelected ? theme.primaryForeground : meta.color}
                  />
                </View>
                <View style={styles.sportDetails}>
                  <Text style={[Typography.labelBold, { color: theme.textPrimary }]}>
                    {opt.label}
                  </Text>
                  <Text style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                    {opt.desc}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Privacy Notice */}
        <View
          style={[
            styles.privacyBox,
            {
              backgroundColor: isDark ? theme.surfaceElevated : theme.surfaceSubdued,
              borderColor: theme.borderLight,
            },
          ]}
        >
          <ShieldCheck size={18} color={theme.primary} />
          <Text
            style={[
              Typography.caption,
              { color: theme.textSecondary, marginLeft: Spacing.sm, flex: 1 },
            ]}
          >
            GPS route data is stored locally on your device and is default PRIVATE.
          </Text>
        </View>
      </ScrollView>

      {/* Start Button */}
      <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <Button
          title={`Start ${ACTIVITY_DEFINITIONS[selectedSport].label}`}
          size="large"
          onPress={handleStart}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: 100,
  },
  sportList: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  sportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  sportIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sportDetails: {
    flex: 1,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  bottomBar: {
    padding: Spacing.screenHorizontal,
    borderTopWidth: 1,
  },
});
