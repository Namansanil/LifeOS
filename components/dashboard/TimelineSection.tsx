import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { TimelineItem } from '@/types';
import { PILLAR_METADATA } from '@/constants/activity';
import { EmptyState } from '@/components/common/EmptyState';
import { Clock } from 'lucide-react-native';

interface TimelineSectionProps {
  items: TimelineItem[];
  onTrackAction?: () => void;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({
  items,
  onTrackAction,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[Typography.eyebrow, { color: theme.textMuted, marginBottom: Spacing.sm }]}>
        LIFE TIMELINE · TODAY
      </Text>

      {items.length === 0 ? (
        <EmptyState
          icon={<Clock size={20} color={theme.textMuted} />}
          title="NO TIMELINE ACTIVITIES YET"
          description="Track your workouts, surf sessions, study blocks, or runs to build today's timeline."
          actionTitle="Track Activity"
          onAction={onTrackAction}
        />
      ) : (
        <View style={styles.timelineList}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const pillarInfo = PILLAR_METADATA[item.category] || PILLAR_METADATA.LIVE;

            return (
              <View key={item.id || index} style={styles.timelineRow}>
                {/* Time & Node Column */}
                <View style={styles.timeColumn}>
                  <Text style={[Typography.labelBold, { color: theme.textPrimary }]}>
                    {item.time}
                  </Text>
                  <View
                    style={[
                      styles.nodeDot,
                      { backgroundColor: pillarInfo.color },
                    ]}
                  />
                  {!isLast && (
                    <View
                      style={[
                        styles.connectorLine,
                        { backgroundColor: theme.borderLight },
                      ]}
                    />
                  )}
                </View>

                {/* Content Card */}
                <View
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                    Shadows.subtle,
                  ]}
                >
                  <View style={styles.itemHeader}>
                    <View
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: isDark
                            ? '#232833'
                            : pillarInfo.bgColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          Typography.eyebrowSmall,
                          { color: pillarInfo.color },
                        ]}
                      >
                        {item.category}
                      </Text>
                    </View>

                    {item.metrics && (
                      <View style={styles.metricsRow}>
                        {item.metrics.map((m, mIdx) => (
                          <Text
                            key={mIdx}
                            style={[
                              Typography.caption,
                              { color: theme.textSecondary, marginLeft: Spacing.sm },
                            ]}
                          >
                            {m.value}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      Typography.labelBold,
                      { color: theme.textPrimary, marginTop: 4 },
                    ]}
                  >
                    {item.title}
                  </Text>

                  {item.subtitle ? (
                    <Text
                      style={[
                        Typography.bodySmall,
                        { color: theme.textSecondary, marginTop: 2 },
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.sectionGap,
    marginBottom: Spacing.xxl,
  },
  timelineList: {
    paddingLeft: Spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  timeColumn: {
    width: 60,
    alignItems: 'center',
    paddingTop: 4,
  },
  nodeDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    marginTop: 6,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    minHeight: 40,
  },
  itemCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginLeft: Spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
