import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { AppHeader } from '@/components/common/AppHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Project, ProjectTask } from '@/types';
import {
  FolderGit2,
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  Code2,
  X,
} from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function ProjectsScreen() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const {
    projects,
    activeProjects,
    completedProjects,
    totalTasksDone,
    toggleTaskStatus,
    saveNewProject,
  } = useProjects();

  const [modalVisible, setModalVisible] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectTech, setNewProjectTech] = useState('');

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const newProj: Project = {
      id: `proj_${Date.now()}`,
      user_id: user?.id || '',
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      status: 'ACTIVE',
      technologies: newProjectTech
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      total_time_seconds: 0,
      tasks: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveNewProject(newProj);
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectTech('');
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader
        title="PROJECTS"
        subtitle="Software engineering, milestones & deep work"
        rightAction={
          <Button
            title="New Project"
            size="small"
            icon={<Plus size={14} color={theme.primaryForeground} />}
            onPress={() => setModalVisible(true)}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Header Stats */}
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
            Shadows.subtle,
          ]}
        >
          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              ACTIVE PROJECTS
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {activeProjects.length}
            </Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: theme.borderLight }]} />

          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              TASKS COMPLETED
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {totalTasksDone}
            </Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: theme.borderLight }]} />

          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              TOTAL PROJECTS
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {projects.length}
            </Text>
          </View>
        </View>

        {/* Project Cards */}
        <View style={styles.listContainer}>
          {projects.length === 0 ? (
            <EmptyState
              icon={<FolderGit2 size={24} color={theme.textMuted} />}
              title="NO PROJECTS ACTIVE"
              description="Capture your engineering projects, milestones, and task backlog."
              actionTitle="Create First Project"
              onAction={() => setModalVisible(true)}
            />
          ) : (
            projects.map((proj) => {
              const hours = (proj.total_time_seconds / 3600).toFixed(1);
              return (
                <View
                  key={proj.id}
                  style={[
                    styles.projectCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                    Shadows.subtle,
                  ]}
                >
                  <View style={styles.projHeader}>
                    <View>
                      <View style={styles.statusRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                proj.status === 'ACTIVE'
                                  ? isDark
                                    ? '#143823'
                                    : theme.primaryMuted
                                  : isDark
                                  ? '#232833'
                                  : theme.surfaceSubdued,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              Typography.eyebrowSmall,
                              {
                                color:
                                  proj.status === 'ACTIVE'
                                    ? theme.primary
                                    : theme.textSecondary,
                              },
                            ]}
                          >
                            {proj.status}
                          </Text>
                        </View>
                        <Text
                          style={[
                            Typography.caption,
                            { color: theme.textMuted, marginLeft: Spacing.sm },
                          ]}
                        >
                          {hours}h logged
                        </Text>
                      </View>

                      <Text
                        style={[
                          Typography.headingMedium,
                          { color: theme.textPrimary, marginTop: 6 },
                        ]}
                      >
                        {proj.name}
                      </Text>
                    </View>
                  </View>

                  {proj.description ? (
                    <Text
                      style={[
                        Typography.bodySmall,
                        { color: theme.textSecondary, marginTop: Spacing.xs },
                      ]}
                    >
                      {proj.description}
                    </Text>
                  ) : null}

                  {/* Tech stack chips */}
                  {proj.technologies && proj.technologies.length > 0 && (
                    <View style={styles.techChips}>
                      {proj.technologies.map((tech, tIdx) => (
                        <View
                          key={tIdx}
                          style={[
                            styles.techChip,
                            {
                              backgroundColor: isDark
                                ? '#222834'
                                : theme.surfaceSubdued,
                              borderColor: theme.borderLight,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              Typography.caption,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {tech}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Tasks List */}
                  {proj.tasks && proj.tasks.length > 0 && (
                    <View style={[styles.tasksContainer, { borderTopColor: theme.borderLight }]}>
                      <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: Spacing.xs }]}>
                        TASKS & MILESTONES
                      </Text>
                      {proj.tasks.map((task) => {
                        const isDone = task.status === 'DONE';
                        return (
                          <Pressable
                            key={task.id}
                            onPress={async () => {
                              await haptics.light();
                              toggleTaskStatus(proj.id, task.id);
                            }}
                            style={styles.taskRow}
                          >
                            {isDone ? (
                              <CheckCircle2 size={18} color={theme.primary} />
                            ) : (
                              <Circle size={18} color={theme.textMuted} />
                            )}
                            <Text
                              style={[
                                Typography.bodySmall,
                                {
                                  color: isDone ? theme.textMuted : theme.textPrimary,
                                  textDecorationLine: isDone ? 'line-through' : 'none',
                                  marginLeft: Spacing.sm,
                                  flex: 1,
                                },
                              ]}
                            >
                              {task.title}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal for creating a new project */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
              Shadows.floating,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[Typography.headingMedium, { color: theme.textPrimary }]}>
                New Project
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
                PROJECT NAME
              </Text>
              <TextInput
                value={newProjectName}
                onChangeText={setNewProjectName}
                placeholder="e.g. TideWise Engine"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.textInput,
                  {
                    color: theme.textPrimary,
                    borderColor: theme.border,
                    backgroundColor: isDark ? theme.surfaceElevated : theme.surfaceSubdued,
                  },
                ]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
                DESCRIPTION
              </Text>
              <TextInput
                value={newProjectDesc}
                onChangeText={setNewProjectDesc}
                placeholder="Core purpose and architectural goals"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.textInput,
                  {
                    color: theme.textPrimary,
                    borderColor: theme.border,
                    backgroundColor: isDark ? theme.surfaceElevated : theme.surfaceSubdued,
                  },
                ]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
                TECHNOLOGIES (comma separated)
              </Text>
              <TextInput
                value={newProjectTech}
                onChangeText={setNewProjectTech}
                placeholder="TypeScript, Python, Docker"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.textInput,
                  {
                    color: theme.textPrimary,
                    borderColor: theme.border,
                    backgroundColor: isDark ? theme.surfaceElevated : theme.surfaceSubdued,
                  },
                ]}
              />
            </View>

            <Button
              title="Create Project"
              onPress={handleCreateProject}
              style={{ marginTop: Spacing.lg }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.sm,
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statTile: {
    alignItems: 'center',
  },
  vDivider: {
    width: 1,
    height: 36,
  },
  listContainer: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  projectCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.cardPadding,
    borderWidth: 1,
  },
  projHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  techChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  techChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  tasksContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.screenHorizontal,
  },
  modalContent: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  inputGroup: {
    marginTop: Spacing.sm,
  },
  textInput: {
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
});
