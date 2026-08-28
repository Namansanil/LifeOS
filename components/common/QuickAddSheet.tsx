import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import {
  Footprints,
  Dumbbell,
  Waves,
  GraduationCap,
  FolderGit2,
  CheckCircle2,
  BookOpen,
  X,
} from 'lucide-react-native';
import { haptics } from '@/services/haptics';

interface QuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const QuickAddSheet: React.FC<QuickAddSheetProps> = ({
  visible,
  onClose,
}) => {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const options = [
    {
      id: 'track_gps',
      title: 'Track GPS Activity',
      subtitle: 'Run, Cycle, Walk, or Hike with live tracking',
      icon: Footprints,
      color: theme.primary,
      bgColor: isDark ? '#143823' : theme.primaryMuted,
      action: () => {
        router.push('/track');
      },
    },
    {
      id: 'log_workout',
      title: 'Log Workout',
      subtitle: 'Strength, Gym sets, reps, weight & PRs',
      icon: Dumbbell,
      color: theme.amber,
      bgColor: isDark ? '#3D220E' : theme.amberMuted,
      action: () => {
        router.push('/fitness/log-workout');
      },
    },
    {
      id: 'log_surf',
      title: 'Log Surf Session',
      subtitle: 'Spot, wave quality, board, energy & rating',
      icon: Waves,
      color: '#0284C7',
      bgColor: isDark ? '#0C2A44' : '#E0F2FE',
      action: () => {
        router.push('/surf/log-session');
      },
    },
    {
      id: 'study_timer',
      title: 'Start Study Timer',
      subtitle: 'Deep focus study for college subjects',
      icon: GraduationCap,
      color: '#4338CA',
      bgColor: isDark ? '#1E1B4B' : '#EEF2FF',
      action: () => {
        router.push('/college/study-timer');
      },
    },
    {
      id: 'project_work',
      title: 'Project Work / Task',
      subtitle: 'Add task, sprint, or log engineering hours',
      icon: FolderGit2,
      color: '#C85A32',
      bgColor: isDark ? '#3D1B14' : '#FAECE7',
      action: () => {
        router.push('/(tabs)/projects');
      },
    },
    {
      id: 'daily_reflection',
      title: 'Daily Review & Journal',
      subtitle: 'Evening review, reflect & set tomorrow Top 3',
      icon: BookOpen,
      color: theme.textPrimary,
      bgColor: isDark ? '#222834' : theme.surfaceSubdued,
      action: () => {
        router.push('/review/daily');
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
            Shadows.floating,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[Typography.eyebrow, { color: theme.primary }]}>
                QUICK ACTION
              </Text>
              <Text style={[Typography.headingMedium, { color: theme.textPrimary, marginTop: 2 }]}>
                What are you doing?
              </Text>
            </View>
            <Pressable
              onPress={async () => {
                await haptics.light();
                onClose();
              }}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: isDark ? '#232833' : theme.surfaceSubdued,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <X size={18} color={theme.textPrimary} />
            </Pressable>
          </View>

          {/* Options Grid */}
          <ScrollView
            style={styles.optionsList}
            showsVerticalScrollIndicator={false}
          >
            {options.map((opt) => {
              const IconComponent = opt.icon;
              return (
                <Pressable
                  key={opt.id}
                  style={({ pressed }) => [
                    styles.optionItem,
                    {
                      borderColor: theme.borderLight,
                      backgroundColor: pressed
                        ? isDark
                          ? '#232833'
                          : theme.surfaceSubdued
                        : 'transparent',
                    },
                  ]}
                  onPress={async () => {
                    await haptics.selection();
                    onClose();
                    opt.action();
                  }}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: opt.bgColor },
                    ]}
                  >
                    <IconComponent size={20} color={opt.color} />
                  </View>
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        Typography.labelBold,
                        { color: theme.textPrimary },
                      ]}
                    >
                      {opt.title}
                    </Text>
                    <Text
                      style={[
                        Typography.caption,
                        { color: theme.textSecondary, marginTop: 2 },
                      ]}
                    >
                      {opt.subtitle}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Spacing.huge,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    marginTop: Spacing.xs,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderRadius: BorderRadius.md,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optionText: {
    flex: 1,
  },
});
