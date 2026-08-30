import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import { useCollege } from '@/hooks/useCollege';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Button } from '@/components/common/Button';
import { StudySession, Subject } from '@/types';
import { GraduationCap, Play, Pause, Square, X, BookOpen } from 'lucide-react-native';
import { formatDuration } from '@/services/calculations';
import { haptics } from '@/services/haptics';

export default function StudyTimerScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { subjects, saveNewStudySession } = useCollege();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [sessionTopic, setSessionTopic] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleStart = async () => {
    await haptics.medium();
    setIsActive(true);
  };

  const handlePause = async () => {
    await haptics.light();
    setIsActive(false);
  };

  const handleStopAndSave = async () => {
    await haptics.success();
    setIsActive(false);

    const studySession: StudySession = {
      id: `study_${Date.now()}`,
      user_id: user?.id || '',
      subject_id: selectedSubjectId || 'general',
      title: sessionTopic.trim() || 'Deep Study Session',
      duration: Math.max(60, seconds), // at least 1 minute
      started_at: new Date(Date.now() - seconds * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      notes: sessionTopic.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    await saveNewStudySession(studySession);
    router.replace('/(tabs)');
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={theme.textPrimary} />
        </Pressable>
        <Text style={[Typography.eyebrow, { color: '#4338CA' }]}>
          DEEP STUDY TIMER
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Subject Selector */}
        <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 8 }]}>
          SELECT SUBJECT
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectsScroll}>
          {subjects.map((sub) => {
            const isSelected = selectedSubjectId === sub.id;
            return (
              <Pressable
                key={sub.id}
                onPress={async () => {
                  await haptics.selection();
                  setSelectedSubjectId(sub.id);
                }}
                style={[
                  styles.subjectChip,
                  {
                    backgroundColor: isSelected
                      ? '#4338CA'
                      : isDark
                      ? theme.surfaceElevated
                      : theme.surface,
                    borderColor: isSelected ? '#4338CA' : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.labelBold,
                    { color: isSelected ? '#FFFFFF' : theme.textPrimary },
                  ]}
                >
                  {sub.code} · {sub.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Large Monospace Timer Display */}
        <View
          style={[
            styles.timerHero,
            { backgroundColor: theme.surface, borderColor: theme.border },
            Shadows.card,
          ]}
        >
          <Text style={[Typography.eyebrow, { color: theme.textMuted }]}>
            FOCUSED STUDY TIME
          </Text>
          <Text style={[Typography.displayMetric, { color: theme.textPrimary, fontSize: 60, marginTop: Spacing.sm }]}>
            {formatDuration(seconds)}
          </Text>
          <Text style={[Typography.caption, { color: '#4338CA', marginTop: 4 }]}>
            {selectedSubject?.name || 'Academic Focus'}
          </Text>
        </View>

        {/* Topic Input */}
        <View style={styles.inputGroup}>
          <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
            TOPIC / GOAL FOR THIS SESSION
          </Text>
          <TextInput
            value={sessionTopic}
            onChangeText={setSessionTopic}
            placeholder="e.g. B-Tree Indexing & Query Optimization"
            placeholderTextColor={theme.textMuted}
            style={[styles.textInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
          />
        </View>

        {/* Timer Controls */}
        <View style={styles.controlsRow}>
          {!isActive ? (
            <Button
              title={seconds === 0 ? 'Start Study Block' : 'Resume Session'}
              size="large"
              icon={<Play size={18} color="#FFFFFF" fill="#FFFFFF" />}
              onPress={handleStart}
              style={{ flex: 1 }}
            />
          ) : (
            <Button
              title="Pause Timer"
              size="large"
              variant="secondary"
              icon={<Pause size={18} color="#FFFFFF" fill="#FFFFFF" />}
              onPress={handlePause}
              style={{ flex: 1 }}
            />
          )}

          {seconds > 0 && (
            <Button
              title="Finish & Save"
              size="large"
              icon={<Square size={16} color="#FFFFFF" fill="#FFFFFF" />}
              onPress={handleStopAndSave}
              style={{ flex: 1, marginLeft: Spacing.sm }}
            />
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
    padding: Spacing.screenHorizontal,
    paddingBottom: 60,
  },
  subjectsScroll: {
    marginBottom: Spacing.lg,
  },
  subjectChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  timerHero: {
    padding: Spacing.xxl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  textInput: {
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
