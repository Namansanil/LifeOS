import { Project } from '@/types';
import { db } from '../database';

export const projectsRepository = {
  async getProjects(userId: string): Promise<Project[]> {
    return await db.getProjects(userId);
  },

  async saveProject(project: Project): Promise<void> {
    await db.saveProject(project);
    await db.enqueueSync('projects', project.id, 'CREATE', project);
  },
};
