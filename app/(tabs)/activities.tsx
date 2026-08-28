import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useActivities } from '@/hooks/useActivities';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { AppHeader } from '@/components/common/AppHeader';
import { MetricTile } from '@/components/common/MetricTile';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { ActivityType, Activity } from '@/types';
import { ACTIVITY_DEFINITIONS } from '@/constants/activity';
import {
  Footprints,
  Plus,
  Play,
  Dumbbell,
  Navigation,
  Calendar,
} from 'lucide-react-native';
import { formatPace, formatDuration } from '@/services/calculations';
import { haptics } from '@/services/haptics';

const SPORT_FILTERS: { key: ActivityType | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'RUN', label: 'Run' },
  { key: 'CYCLE', label: 'Cycle' },
  { key: 'WALK', label: 'Walk' },
  { key: 'HIKE', label: 'Hike' },
  { key: 'GYM', label: 'Strength' },
  { key: 'SURF', label: 'Surf' },
];

export default function ActivitiesScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { activities, selectedType, setSelectedType, stats } = useActivities();

  const renderActivityCard = ({ item }: { item: Activity }) => {
    const meta = ACTIVITY_DEFINITIONS[item.type] || ACTIVITY_DEFINITIONS.RUN;
    const dateStr = new Date(item.started_at).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const distKm = (item.distance / 1000).toFixed(2);
    const durationFormatted = formatDuration(item.duration);
    const paceFormatted = formatPace(item.average_pace);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.activityCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            opacity: pressed ? 0.9 : 1,
          },
          Shadows.subtle,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.typeBadgeRow}>
            <View
              style={[
                styles.sportBadge,
                { backgroundColor: isDark ? '#232833' : meta.bgColor },
              ]}
            >
              <Text style={[Typography.eyebrowSmall, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>
            <Text style={[Typography.caption, { color: theme.textMuted, marginLeft: Spacing.sm }]}>
              {dateStr}
            </Text>
          </View>

          <View style={styles.sourceTag}>
            <Text style={[Typography.caption, { color: theme.textSecondary }]}>
              {item.source}
            </Text>
          </View>
        </View>

        <Text style={[Typography.headingSmall, { color: theme.textPrimary, marginTop: 6 }]}>
          {item.title || `${meta.label} Session`}
        </Text>

        {/* Key Metrics Row */}
        <View style={[styles.metricsGrid, { borderTopColor: theme.borderLight }]}>
          {item.distance > 0 ? (
            <View style={styles.metricCol}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
                DISTANCE
              </Text>
              <Text style={[Typography.headingMedium, { color: theme.textPrimary, marginTop: 2 }]}>
                {distKm} <Text style={[Typography.caption, { color: theme.textSecondary }]}>km</Text>
              </Text>
            </View>
          ) : null}

          <View style={styles.metricCol}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              TIME
            </Text>
            <Text style={[Typography.headingMedium, { color: theme.textPrimary, marginTop: 2 }]}>
              {durationFormatted}
            </Text>
          </View>

          {item.average_pace > 0 ? (
            <View style={styles.metricCol}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
                AVG PACE
              </Text>
              <Text style={[Typography.labelBold, { color: theme.textPrimary, marginTop: 4 }]}>
                {paceFormatted}
              </Text>
            </View>
          ) : null}

          {item.elevation_gain > 0 ? (
            <View style={styles.metricCol}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
                ELEVATION
              </Text>
              <Text style={[Typography.labelBold, { color: theme.textPrimary, marginTop: 4 }]}>
                +{Math.round(item.elevation_gain)}m
              </Text>
            </View>
          ) : null}
        </View>

        {item.notes ? (
          <Text
            numberOfLines={2}
            style={[
              Typography.bodySmall,
              { color: theme.textSecondary, marginTop: Spacing.sm, fontStyle: 'italic' },
            ]}
          >
            "{item.notes}"
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader
        title="ACTIVITIES"
        subtitle="GPS tracking, sport history & performance"
        rightAction={
          <Button
            title="Track"
            size="small"
            icon={<Play size={14} color={theme.primaryForeground} fill={theme.primaryForeground} />}
            onPress={() => router.push('/track')}
          />
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {/* Aggregate Stats Row */}
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
            Shadows.subtle,
          ]}
        >
          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              TOTAL DISTANCE
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {stats.totalDistanceKm} <Text style={Typography.caption}>km</Text>
            </Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: theme.borderLight }]} />

          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              TOTAL TIME
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {stats.totalHours} <Text style={Typography.caption}>hrs</Text>
            </Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: theme.borderLight }]} />

          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              ACTIVITIES
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {stats.totalCount}
            </Text>
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContainer}
        >
          {SPORT_FILTERS.map((f) => {
            const isSelected = selectedType === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={async () => {
                  await haptics.selection();
                  setSelectedType(f.key);
                }}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected
                      ? theme.primary
                      : isDark
                      ? theme.surfaceElevated
                      : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.eyebrowSmall,
                    {
                      color: isSelected
                        ? theme.primaryForeground
                        : theme.textSecondary,
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Activity List */}
        <View style={styles.listContainer}>
          {activities.length === 0 ? (
            <EmptyState
              icon={<Footprints size={24} color={theme.textMuted} />}
              title="NO ACTIVITIES YET"
              description="Start your first GPS run, ride, walk, or gym workout session."
              actionTitle="Track New Activity"
              onAction={() => router.push('/track')}
            />
          ) : (
            activities.map((item) => (
              <View key={item.id} style={{ marginBottom: Spacing.md }}>
                {renderActivityCard({ item })}
              </View>
            ))
          )}
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
    paddingBottom: 100,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.sm,
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statTile: {
    alignItems: 'center',
  },
  vDivider: {
    width: 1,
    height: 36,
  },
  filtersScroll: {
    marginTop: Spacing.md,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.sm,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  listContainer: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.md,
  },
  activityCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.cardPadding,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.xs,
  },
  sourceTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: 1,
  },
  metricCol: {
    flex: 1,
  },
});
