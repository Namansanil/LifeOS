import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { DailyPriority, LifePillar } from '@/types';
import { Check, Plus, Edit3, X } from 'lucide-react-native';
import { haptics } from '@/services/haptics';
import { Button } from '@/components/common/Button';

interface PriorityListProps {
  priorities: DailyPriority[];
  onToggle: (id: string) => void;
  onSavePriorities: (items: DailyPriority[]) => void;
}

export const PriorityList: React.FC<PriorityListProps> = ({
  priorities,
  onToggle,
  onSavePriorities,
}) => {
  const { theme, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTitles, setEditingTitles] = useState<string[]>(['', '', '']);

  const openEditor = () => {
    setEditingTitles([
      priorities[0]?.title || '',
      priorities[1]?.title || '',
      priorities[2]?.title || '',
    ]);
    setModalVisible(true);
  };

  const handleSaveModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const updated: DailyPriority[] = editingTitles
      .map((title, idx) => ({
        id: priorities[idx]?.id || `p_${today}_${idx + 1}`,
        user_id: priorities[idx]?.user_id || 'demo-user-naman',
        date: today,
        order_index: idx + 1,
        title: title.trim() || `Priority 0${idx + 1}`,
        completed: priorities[idx]?.completed || false,
        category: priorities[idx]?.category || ('LIVE' as LifePillar),
      }))
      .slice(0, 3);

    onSavePriorities(updated);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[Typography.eyebrow, { color: theme.textMuted }]}>
          TODAY'S TOP 3
        </Text>
        <Pressable
          onPress={async () => {
            await haptics.selection();
            openEditor();
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
        >
          <Text style={[Typography.eyebrowSmall, { color: theme.primary }]}>
            EDIT TOP 3
          </Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {priorities.map((item, index) => {
          const numberStr = `0${index + 1}`;
          const isDone = item.completed;

          return (
            <Pressable
              key={item.id || index}
              onPress={async () => {
                await haptics.light();
                onToggle(item.id);
              }}
              style={({ pressed }) => [
                styles.itemRow,
                {
                  backgroundColor: theme.surface,
                  borderColor: isDone ? theme.primary : theme.border,
                  opacity: pressed ? 0.9 : 1,
                },
                Shadows.subtle,
              ]}
            >
              {/* Order index pill */}
              <View
                style={[
                  styles.numberBadge,
                  {
                    backgroundColor: isDone
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
                    { color: isDone ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {numberStr}
                </Text>
              </View>

              {/* Title */}
              <Text
                style={[
                  Typography.labelBold,
                  styles.titleText,
                  {
                    color: isDone ? theme.textMuted : theme.textPrimary,
                    textDecorationLine: isDone ? 'line-through' : 'none',
                  },
                ]}
              >
                {item.title}
              </Text>

              {/* Checkbox button */}
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: isDone ? theme.primary : theme.border,
                    backgroundColor: isDone ? theme.primary : 'transparent',
                  },
                ]}
              >
                {isDone ? <Check size={14} color={theme.primaryForeground} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Modal for editing Top 3 priorities */}
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
                Set Today's Top 3
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.md }]}>
              Define the three non-negotiable priorities that define success for today.
            </Text>

            {[0, 1, 2].map((idx) => (
              <View key={idx} style={styles.inputGroup}>
                <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
                  PRIORITY 0{idx + 1}
                </Text>
                <TextInput
                  value={editingTitles[idx]}
                  onChangeText={(text) => {
                    const copy = [...editingTitles];
                    copy[idx] = text;
                    setEditingTitles(copy);
                  }}
                  placeholder={`What is priority 0${idx + 1}?`}
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
            ))}

            <Button
              title="Save Priorities"
              onPress={handleSaveModal}
              style={{ marginTop: Spacing.lg }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.sectionGap,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  list: {
    gap: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  numberBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    marginRight: Spacing.md,
  },
  titleText: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: Spacing.xs,
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
