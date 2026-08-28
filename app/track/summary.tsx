import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useTracking } from '@/hooks/useTracking';
import { useAppData } from '@/context/AppDataContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Button } from '@/components/common/Button';
import { Activity, ActivityVisibility } from '@/types';
import { formatDuration, formatPace } from '@/services/calculations';
import { ACTIVITY_DEFINITIONS } from '@/constants/activity';
import { Star, Shield, Check, Trash2, MapPin, Zap, Mountain, Activity as ActivityIcon } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function ActivitySummaryScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { metrics, activityType, points, rawPoints, splits, reset } = useTracking();
  const { saveNewActivity } = useAppData();

  const meta = ACTIVITY_DEFINITIONS[activityType] || ACTIVITY_DEFINITIONS.RUN;

  const [title, setTitle] = useState(`${meta.label} Session`);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(5);
  const [visibility, setVisibility] = useState<ActivityVisibility>('PRIVATE');

  const distKm = (metrics.distanceMeters / 1000).toFixed(2);
  const timeFormatted = formatDuration(metrics.elapsedSeconds);
  const movingTimeFormatted = formatDuration(metrics.movingSeconds);
  const paceFormatted = formatPace(metrics.averagePaceSecKm);
  const bestPaceFormatted = metrics.bestPaceSecKm ? formatPace(metrics.bestPaceSecKm) : '--:--';
  const speedKmh = (metrics.averageSpeedMps * 3.6).toFixed(1);

  const handleSave = async () => {
    await haptics.success();
    const newActivity: Activity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: '',
      type: activityType,
      category: meta.category,
      title: title.trim() || `${meta.label} Session`,
      started_at: new Date(Date.now() - metrics.elapsedSeconds * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      duration: metrics.elapsedSeconds,
      distance: metrics.distanceMeters,
      moving_time: metrics.movingSeconds || metrics.elapsedSeconds,
      elevation_gain: metrics.elevationGainMeters,
      elevation_loss: metrics.elevationLossMeters,
      average_speed: metrics.averageSpeedMps,
      max_speed: metrics.maxSpeedMps,
      average_pace: metrics.averagePaceSecKm,
      best_pace: metrics.bestPaceSecKm,
      calories: Math.round((metrics.distanceMeters / 1000) * 65),
      source: 'GPS',
      visibility,
      notes: notes.trim() || undefined,
      rating,
      gps_quality: metrics.gpsQuality,
      splits: splits.length > 0 ? splits : undefined,
      route: points,
      raw_route: rawPoints,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveNewActivity(newActivity);
    await reset();
    router.replace('/(tabs)');
  };

  const handleDiscard = async () => {
    await haptics.warning();
    await reset();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.qualityBadge, { backgroundColor: isDark ? '#143823' : theme.primaryMuted }]}>
            <Text style={[Typography.eyebrowSmall, { color: theme.primary }]}>
              GPS QUALITY: {metrics.gpsQuality}
            </Text>
          </View>
          <Text style={[Typography.displayMedium, { color: theme.textPrimary, marginTop: 6 }]}>
            {distKm} <Text style={Typography.headingMedium}>km</Text>
          </Text>
        </View>

        {/* Core Authoritative Metrics Grid */}
        <View
          style={[
            styles.metricsCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            Shadows.subtle,
          ]}
        >
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
                MOVING TIME
              </Text>
              <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
                {movingTimeFormatted}
              </Text>
              <Text style={[Typography.caption, { color: theme.textMuted }]}>
                Elapsed {timeFormatted}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

            <View style={styles.metricItem}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
                {meta.primaryMetric === 'SPEED' ? 'AVG SPEED' : 'AVG PACE'}
              </Text>
              <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
                {meta.primaryMetric === 'SPEED' ? `${speedKmh} km/h` : paceFormatted}
              </Text>
              {meta.primaryMetric !== 'SPEED' && Boolean(metrics.bestPaceSecKm) ? (
                <Text style={[Typography.caption, { color: theme.textMuted }]}>
                  Best {bestPaceFormatted}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={[styles.hDivider, { backgroundColor: theme.borderLight }]} />

          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
                ELEVATION GAIN
              </Text>
              <Text style={[Typography.headingMedium, { color: theme.textPrimary, marginTop: 2 }]}>
                +{Math.round(metrics.elevationGainMeters)}m
              </Text>
              <Text style={[Typography.caption, { color: theme.textMuted }]}>
                Loss -{Math.round(metrics.elevationLossMeters)}m
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

            <View style={styles.metricItem}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
                EST. CALORIES
              </Text>
              <Text style={[Typography.headingMedium, { color: theme.textPrimary, marginTop: 2 }]}>
                {Math.round((metrics.distanceMeters / 1000) * 65)} kcal
              </Text>
              <Text style={[Typography.caption, { color: theme.textMuted }]}>
                {points.length} GPS pts
              </Text>
            </View>
          </View>
        </View>

        {/* Splits Table (If Splits exist) */}
        {splits.length > 0 && (
          <View style={[styles.splitsSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 8 }]}>
              DISTANCE SPLITS ({splits.length})
            </Text>
            <View style={styles.splitHeaderRow}>
              <Text style={[styles.splitColHeader, { color: theme.textMuted }]}>SPLIT</Text>
              <Text style={[styles.splitColHeader, { color: theme.textMuted }]}>PACE</Text>
              <Text style={[styles.splitColHeader, { color: theme.textMuted }]}>TIME</Text>
              <Text style={[styles.splitColHeader, { color: theme.textMuted }]}>ELEV</Text>
            </View>
            {splits.map((s) => (
              <View key={s.splitNumber} style={[styles.splitRow, { borderBottomColor: theme.borderLight }]}>
                <Text style={[Typography.bodyMedium, { color: theme.textPrimary, fontWeight: '700' }]}>
                  {s.splitNumber} {meta.primaryMetric === 'SPEED' ? ' (5km)' : ' (1km)'}
                </Text>
                <Text style={[Typography.bodyMedium, { color: theme.textPrimary }]}>
                  {meta.primaryMetric === 'SPEED' ? `${s.speedKmh} km/h` : formatPace(s.paceSecKm)}
                </Text>
                <Text style={[Typography.bodyMedium, { color: theme.textSecondary }]}>
                  {formatDuration(s.movingSeconds || s.durationSeconds)}
                </Text>
                <Text style={[Typography.bodyMedium, { color: theme.textSecondary }]}>
                  +{s.elevationGainMeters}m
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Inputs */}
        <View style={styles.inputsSection}>
          <View style={styles.inputGroup}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
              ACTIVITY TITLE
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Coastal Morning Tempo"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.textInput,
                {
                  color: theme.textPrimary,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
              NOTES & CONDITIONS
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="How did your stride and cadence feel?"
              placeholderTextColor={theme.textMuted}
              multiline
              style={[
                styles.textArea,
                {
                  color: theme.textPrimary,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
            />
          </View>

          {/* Rating */}
          <View style={styles.inputGroup}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 6 }]}>
              SESSION RATING
            </Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={async () => {
                    await haptics.selection();
                    setRating(star);
                  }}
                  style={{ padding: 6 }}
                >
                  <Star
                    size={28}
                    color={star <= rating ? '#C25E00' : theme.textMuted}
                    fill={star <= rating ? '#C25E00' : 'transparent'}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Save & Discard Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Save Activity to LifeOS"
            size="large"
            onPress={handleSave}
          />
          <Button
            title="Discard"
            variant="ghost"
            onPress={handleDiscard}
            style={{ marginTop: Spacing.sm }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.screenHorizontal,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  qualityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  metricsCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 44,
  },
  hDivider: {
    height: 1,
    width: '100%',
    marginVertical: Spacing.md,
  },
  splitsSection: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.cardPadding,
    borderWidth: 1,
  },
  splitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  splitColHeader: {
    ...Typography.eyebrowSmall,
    fontSize: 10,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  inputsSection: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  inputGroup: {},
  textInput: {
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    marginTop: Spacing.xl,
  },
});
