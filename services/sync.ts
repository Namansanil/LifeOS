import { db } from './database';
import { isSupabaseConfigured, supabase } from './supabase';
import { SyncQueueItem } from '@/types';

class SyncService {
  private isSyncing = false;
  private syncInterval: any = null;

  startAutoSync(intervalMs = 30000) {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      this.processQueue().catch((err) =>
        console.warn('AutoSync background cycle error:', err)
      );
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isSyncing || !isSupabaseConfigured) {
      return { processed: 0, failed: 0 };
    }

    this.isSyncing = true;
    let processed = 0;
    let failed = 0;

    try {
      const items = await db.getPendingSyncItems();
      for (const item of items) {
        try {
          await this.syncItem(item);
          await db.updateSyncItemStatus(item.id, 'COMPLETED');
          processed++;
        } catch (err: any) {
          console.warn(`Sync item failed for [${item.entity}:${item.entity_id}]:`, err);
          await db.updateSyncItemStatus(
            item.id,
            'FAILED',
            err?.message || 'Sync error'
          );
          failed++;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { processed, failed };
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const payload = JSON.parse(item.payload);
    const table = this.getSupabaseTableName(item.entity);

    if (item.operation === 'CREATE' || item.operation === 'UPDATE') {
      const { error } = await supabase.from(table).upsert(payload, {
        onConflict: 'id',
      });
      if (error) throw error;
    } else if (item.operation === 'DELETE') {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', item.entity_id);
      if (error) throw error;
    }
  }

  private getSupabaseTableName(entity: string): string {
    switch (entity) {
      case 'habit':
        return 'habits';
      case 'habit_completion':
        return 'habit_completions';
      case 'activity':
        return 'activities';
      case 'workout':
        return 'workouts';
      case 'surf_session':
        return 'surf_sessions';
      case 'subject':
        return 'subjects';
      case 'study_session':
        return 'study_sessions';
      case 'project':
        return 'projects';
      case 'daily_priority':
        return 'daily_priorities';
      case 'daily_log':
        return 'daily_logs';
      case 'goal':
      case 'goals':
        return 'goals';
      case 'goal_milestone':
        return 'goal_milestones';
      default:
        return entity;
    }
  }
}

export const syncService = new SyncService();
