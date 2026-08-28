import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useCollege } from '@/hooks/useCollege';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { GraduationCap, Play, BookOpen, Clock, X } from 'lucide-react-native';

export default function CollegeIndexScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { subjects, studySessions, totalStudyMinutes } = useCollege();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={theme.textPrimary} />
        </Pressable>
        <Text style={[Typography.eyebrow, { color: '#4338CA' }]}>
          COLLEGE & STUDY
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View
          style={[
            styles.statsCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            Shadows.subtle,
          ]}
        >
          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              SUBJECTS
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {subjects.length}
            </Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: theme.borderLight }]} />

          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              TOTAL STUDY TIME
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {(totalStudyMinutes / 60).toFixed(1)} <Text style={Typography.caption}>hrs</Text>
            </Text>
          </View>
        </View>

        <Button
          title="Start Study Timer"
          icon={<Play size={16} color="#FFFFFF" fill="#FFFFFF" />}
          onPress={() => router.push('/college/study-timer')}
          style={{ marginTop: Spacing.md }}
        />

        {/* Subjects List */}
        <Text style={[Typography.eyebrow, { color: theme.textMuted, marginTop: Spacing.xl, marginBottom: Spacing.sm }]}>
          ENROLLED SUBJECTS
        </Text>

        <View style={styles.subjectsGrid}>
          {subjects.map((sub) => (
            <View
              key={sub.id}
              style={[
                styles.subjectCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                Shadows.subtle,
              ]}
            >
              <View style={styles.subHeader}>
                <Text style={[Typography.labelBold, { color: theme.primary }]}>
                  {sub.code}
                </Text>
                <Text style={[Typography.caption, { color: theme.textMuted }]}>
                  {sub.credits} Credits
                </Text>
              </View>
              <Text style={[Typography.headingSmall, { color: theme.textPrimary, marginTop: 4 }]}>
                {sub.name}
              </Text>
            </View>
          ))}
        </View>
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
  subjectsGrid: {
    gap: Spacing.sm,
  },
  subjectCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
