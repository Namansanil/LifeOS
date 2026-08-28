import { useMemo } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { Project, ProjectTask } from '@/types';

export function useProjects() {
  const { projects, saveNewProject } = useAppData();

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'ACTIVE'),
    [projects]
  );

  const completedProjects = useMemo(
    () => projects.filter((p) => p.status === 'COMPLETED'),
    [projects]
  );

  const totalTasksDone = useMemo(() => {
    return projects.reduce(
      (sum, p) => sum + (p.tasks || []).filter((t) => t.status === 'DONE').length,
      0
    );
  }, [projects]);

  const toggleTaskStatus = async (projectId: string, taskId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const updatedTasks = (project.tasks || []).map((t) => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'DONE' ? 'TODO' : 'DONE';
        return { ...t, status: nextStatus as ProjectTask['status'] };
      }
      return t;
    });

    const updatedProject: Project = {
      ...project,
      tasks: updatedTasks,
      updated_at: new Date().toISOString(),
    };

    await saveNewProject(updatedProject);
  };

  return {
    projects,
    activeProjects,
    completedProjects,
    totalTasksDone,
    toggleTaskStatus,
    saveNewProject,
  };
}
