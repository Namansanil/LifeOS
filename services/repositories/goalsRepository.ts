import { Goal, GoalMilestone, LifePillar } from '@/types';
import { db } from '../database';

export const goalsRepository = {
  async getGoals(userId: string): Promise<Goal[]> {
    return await db.getGoals(userId);
  },

  async getGoalsByPillar(userId: string, pillar: LifePillar): Promise<Goal[]> {
    const goals = await db.getGoals(userId);
    return goals.filter((g) => g.pillar === pillar);
  },

  async saveGoal(goal: Goal): Promise<void> {
    // Recalculate progress percentage based on milestones
    let progress = goal.progress_percentage || 0;
    if (goal.milestones && goal.milestones.length > 0) {
      const completed = goal.milestones.filter((m) => m.completed).length;
      progress = Math.round((completed / goal.milestones.length) * 100);
    }
    const updatedGoal: Goal = {
      ...goal,
      progress_percentage: progress,
      status: progress >= 100 ? 'ACHIEVED' : goal.status,
      updated_at: new Date().toISOString(),
    };
    await db.saveGoal(updatedGoal);
    await db.enqueueSync('goals', updatedGoal.id, 'CREATE', updatedGoal);
  },

  async toggleMilestone(
    userId: string,
    goalId: string,
    milestoneId: string,
    completed: boolean
  ): Promise<Goal | null> {
    const goals = await db.getGoals(userId);
    const target = goals.find((g) => g.id === goalId);
    if (!target) return null;

    const milestones = target.milestones.map((m) => {
      if (m.id === milestoneId) {
        return {
          ...m,
          completed,
          completed_at: completed ? new Date().toISOString() : undefined,
        };
      }
      return m;
    });

    const completedCount = milestones.filter((m) => m.completed).length;
    const progress = Math.round((completedCount / (milestones.length || 1)) * 100);

    const updatedGoal: Goal = {
      ...target,
      milestones,
      progress_percentage: progress,
      status: progress >= 100 ? 'ACHIEVED' : target.status,
      updated_at: new Date().toISOString(),
    };
    await this.saveGoal(updatedGoal);
    return updatedGoal;
  },

  async deleteGoal(goalId: string, userId: string): Promise<void> {
    await db.deleteGoal(goalId, userId);
    await db.enqueueSync('goals', goalId, 'DELETE', { id: goalId, user_id: userId });
  },
};
