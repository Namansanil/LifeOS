import { useAppData } from '@/context/AppDataContext';
import { Habit } from '@/types';

export function useHabits() {
  const { habits, habitCompletions, toggleHabit, saveNewHabit } = useAppData();

  const isHabitCompletedToday = (habitId: string) => {
    return habitCompletions.some((c) => c.habit_id === habitId && c.completed);
  };

  const morningHabits = habits.filter((h) => h.category === 'MORNING' && h.active);
  const dayHabits = habits.filter((h) => h.category === 'DAY' && h.active);
  const nightHabits = habits.filter((h) => h.category === 'NIGHT' && h.active);

  return {
    habits,
    morningHabits,
    dayHabits,
    nightHabits,
    habitCompletions,
    isHabitCompletedToday,
    toggleHabit,
    saveNewHabit,
  };
}
