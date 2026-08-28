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
import { useWorkout } from '@/hooks/useWorkout';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Button } from '@/components/common/Button';
import { Workout, WorkoutExercise, WorkoutSet } from '@/types';
import { Plus, Trash2, Check, Dumbbell, X, Trophy } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function LogWorkoutScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { saveNewWorkout, getStatsForWorkout } = useWorkout();

  const [title, setTitle] = useState('Strength Session');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([
    {
      id: 'ex_1',
      workout_id: '',
      exercise_name: 'Barbell Back Squat',
      order_index: 0,
      sets: [
        { set_number: 1, weight_kg: 80, reps: 8, completed: true },
        { set_number: 2, weight_kg: 95, reps: 6, completed: true },
        { set_number: 3, weight_kg: 105, reps: 5, completed: false },
      ],
    },
    {
      id: 'ex_2',
      workout_id: '',
      exercise_name: 'Romanian Deadlift',
      order_index: 1,
      sets: [
        { set_number: 1, weight_kg: 70, reps: 10, completed: true },
        { set_number: 2, weight_kg: 85, reps: 8, completed: false },
      ],
    },
  ]);

  const addExercise = () => {
    setExercises((prev) => [
      ...prev,
      {
        id: `ex_${Date.now()}`,
        workout_id: '',
        exercise_name: 'New Exercise',
        order_index: prev.length,
        sets: [{ set_number: 1, weight_kg: 60, reps: 10, completed: false }],
      },
    ]);
  };

  const addSet = (exIndex: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const ex = copy[exIndex];
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        set_number: ex.sets.length + 1,
        weight_kg: lastSet ? lastSet.weight_kg : 60,
        reps: lastSet ? lastSet.reps : 8,
        completed: false,
      });
      return copy;
    });
  };

  const toggleSetComplete = async (exIndex: number, setIndex: number) => {
    await haptics.light();
    setExercises((prev) => {
      const copy = [...prev];
      const s = copy[exIndex].sets[setIndex];
      s.completed = !s.completed;
      return copy;
    });
  };

  const updateSetValues = (
    exIndex: number,
    setIndex: number,
    weight: number,
    reps: number
  ) => {
    setExercises((prev) => {
      const copy = [...prev];
      const s = copy[exIndex].sets[setIndex];
      s.weight_kg = weight;
      s.reps = reps;
      return copy;
    });
  };

  const handleSave = async () => {
    await haptics.success();
    const tempWorkout: Workout = {
      id: `w_${Date.now()}`,
      user_id: 'demo-user-naman',
      title: title.trim() || 'Strength Workout',
      type: 'GYM',
      started_at: new Date(Date.now() - 3600000).toISOString(),
      ended_at: new Date().toISOString(),
      duration: 3600,
      volume: 0,
      exercises,
      rating: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const stats = getStatsForWorkout(tempWorkout);
    tempWorkout.volume = stats.totalVolumeKg;

    await saveNewWorkout(tempWorkout);
    router.replace('/(tabs)');
  };

  // Calculate live volume
  const liveVolume = exercises.reduce(
    (acc, ex) =>
      acc +
      ex.sets
        .filter((s) => s.completed)
        .reduce((sum, s) => sum + s.weight_kg * s.reps, 0),
    0
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={theme.textPrimary} />
        </Pressable>
        <Text style={[Typography.eyebrow, { color: theme.amber }]}>
          WORKOUT LOGGER
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Workout Title (e.g. Legs & Core)"
          placeholderTextColor={theme.textMuted}
          style={[Typography.headingLarge, { color: theme.textPrimary, marginBottom: Spacing.sm }]}
        />

        {/* Live Volume Counter */}
        <View
          style={[
            styles.volumeBadge,
            { backgroundColor: isDark ? '#3D220E' : theme.amberMuted, borderColor: theme.amber },
          ]}
        >
          <Dumbbell size={18} color={theme.amber} />
          <Text style={[Typography.labelBold, { color: theme.amber, marginLeft: Spacing.sm }]}>
            CURRENT VOLUME: {liveVolume.toLocaleString()} KG
          </Text>
        </View>

        {/* Exercises */}
        {exercises.map((ex, exIdx) => (
          <View
            key={ex.id || exIdx}
            style={[
              styles.exerciseCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              Shadows.subtle,
            ]}
          >
            <TextInput
              value={ex.exercise_name}
              onChangeText={(text) => {
                const copy = [...exercises];
                copy[exIdx].exercise_name = text;
                setExercises(copy);
              }}
              style={[Typography.headingSmall, { color: theme.textPrimary, marginBottom: Spacing.sm }]}
            />

            {/* Set Table Header */}
            <View style={styles.setRowHeader}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, width: 40 }]}>
                SET
              </Text>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, flex: 1, textAlign: 'center' }]}>
                KG
              </Text>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, flex: 1, textAlign: 'center' }]}>
                REPS
              </Text>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, width: 40, textAlign: 'center' }]}>
                DONE
              </Text>
            </View>

            {/* Sets */}
            {ex.sets.map((set, setIdx) => (
              <View key={setIdx} style={styles.setRow}>
                <Text style={[Typography.labelBold, { color: theme.textSecondary, width: 40 }]}>
                  0{set.set_number}
                </Text>

                <TextInput
                  keyboardType="numeric"
                  value={String(set.weight_kg)}
                  onChangeText={(val) =>
                    updateSetValues(exIdx, setIdx, parseFloat(val) || 0, set.reps)
                  }
                  style={[
                    styles.numInput,
                    { color: theme.textPrimary, borderColor: theme.borderLight, backgroundColor: isDark ? '#232833' : theme.surfaceSubdued },
                  ]}
                />

                <TextInput
                  keyboardType="numeric"
                  value={String(set.reps)}
                  onChangeText={(val) =>
                    updateSetValues(exIdx, setIdx, set.weight_kg, parseInt(val, 10) || 0)
                  }
                  style={[
                    styles.numInput,
                    { color: theme.textPrimary, borderColor: theme.borderLight, backgroundColor: isDark ? '#232833' : theme.surfaceSubdued },
                  ]}
                />

                <Pressable
                  onPress={() => toggleSetComplete(exIdx, setIdx)}
                  style={[
                    styles.checkButton,
                    {
                      backgroundColor: set.completed ? theme.primary : 'transparent',
                      borderColor: set.completed ? theme.primary : theme.border,
                    },
                  ]}
                >
                  {set.completed ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                </Pressable>
              </View>
            ))}

            <Button
              title="+ Add Set"
              variant="outline"
              size="small"
              onPress={() => addSet(exIdx)}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        ))}

        <Button
          title="+ Add Exercise"
          variant="outline"
          onPress={addExercise}
          style={{ marginTop: Spacing.sm }}
        />

        <Button
          title="Save Workout"
          size="large"
          onPress={handleSave}
          style={{ marginTop: Spacing.xl }}
        />
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
  volumeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  exerciseCard: {
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  setRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: Spacing.sm,
  },
  numInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  checkButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
