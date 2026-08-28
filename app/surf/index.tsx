import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useSurf } from '@/hooks/useSurf';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Waves, Plus, Star, X } from 'lucide-react-native';

export default function SurfIndexScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { surfSessions, stats } = useSurf();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={theme.textPrimary} />
        </Pressable>
        <Text style={[Typography.eyebrow, { color: '#0284C7' }]}>
          SURF & OCEAN
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Surf Stats */}
        <View
          style={[
            styles.statsCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            Shadows.subtle,
          ]}
        >
          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              SESSIONS
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {stats.totalSessions}
            </Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: theme.borderLight }]} />

          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              TOTAL HOURS
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {(stats.totalDurationSeconds / 3600).toFixed(1)} <Text style={Typography.caption}>hrs</Text>
            </Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: theme.borderLight }]} />

          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              AVG WAVES
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {stats.avgWaveQuality}/5
            </Text>
          </View>
        </View>

        <Button
          title="Log Surf Session"
          icon={<Plus size={16} color="#FFFFFF" />}
          onPress={() => router.push('/surf/log-session')}
          style={{ marginTop: Spacing.md }}
        />

        {/* Sessions List */}
        <Text style={[Typography.eyebrow, { color: theme.textMuted, marginTop: Spacing.xl, marginBottom: Spacing.sm }]}>
          SESSION LOGS
        </Text>

        {surfSessions.length === 0 ? (
          <EmptyState
            icon={<Waves size={24} color="#0284C7" />}
            title="NO SURF SESSIONS LOGGED"
            description="Record your ocean sessions, swell ratings, and wave quality."
            actionTitle="Log First Session"
            onAction={() => router.push('/surf/log-session')}
          />
        ) : (
          surfSessions.map((s) => (
            <View
              key={s.id}
              style={[
                styles.sessionCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                Shadows.subtle,
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={[Typography.headingSmall, { color: theme.textPrimary }]}>
                  {s.location_name}
                </Text>
                <Text style={[Typography.caption, { color: theme.textMuted }]}>
                  {new Date(s.started_at).toLocaleDateString()}
                </Text>
              </View>

              <Text style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                {Math.round(s.duration / 60)} mins · Wave Quality {s.wave_quality}/5 · Energy {s.energy_level}/10
              </Text>

              {s.notes && (
                <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 4, fontStyle: 'italic' }]}>
                  "{s.notes}"
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
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
    padding: Spacing.screenHorizontal,
    paddingBottom: 60,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  statTile: {
    alignItems: 'center',
  },
  vDivider: {
    width: 1,
    height: 36,
  },
  sessionCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
