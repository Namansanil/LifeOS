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
import { useAuth } from '@/context/AuthContext';
import { useSurf } from '@/hooks/useSurf';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Button } from '@/components/common/Button';
import { SurfSession } from '@/types';
import { Waves, Star, X, MapPin } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function LogSurfSessionScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { saveNewSurfSession } = useSurf();

  const [locationName, setLocationName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [waveQuality, setWaveQuality] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(7);
  const [boardUsed, setBoardUsed] = useState('');
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    await haptics.success();
    const durSec = (parseInt(durationMinutes, 10) || 60) * 60;
    const session: SurfSession = {
      id: `surf_${Date.now()}`,
      user_id: user?.id || '',
      location_name: locationName.trim() || 'Ocean Spot',
      session_type: 'FUN',
      started_at: new Date(Date.now() - durSec * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      duration: durSec,
      wave_quality: waveQuality,
      energy_level: energyLevel,
      board_used: boardUsed.trim() || undefined,
      rating,
      notes: notes.trim() || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveNewSurfSession(session);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={theme.textPrimary} />
        </Pressable>
        <Text style={[Typography.eyebrow, { color: '#0284C7' }]}>
          SURF JOURNAL
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginBottom: Spacing.md }]}>
          Log Surf Session
        </Text>

        <View style={styles.inputGroup}>
          <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
            SURF SPOT / LOCATION
          </Text>
          <TextInput
            value={locationName}
            onChangeText={setLocationName}
            placeholder="e.g. North Point Reef"
            placeholderTextColor={theme.textMuted}
            style={[styles.textInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
            DURATION (MINUTES)
          </Text>
          <TextInput
            keyboardType="numeric"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="90"
            placeholderTextColor={theme.textMuted}
            style={[styles.textInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
            BOARD USED
          </Text>
          <TextInput
            value={boardUsed}
            onChangeText={setBoardUsed}
            placeholder="e.g. 6’0 Shortboard / Fish"
            placeholderTextColor={theme.textMuted}
            style={[styles.textInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
          />
        </View>

        {/* Wave Quality Selector */}
        <View style={styles.inputGroup}>
          <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 6 }]}>
            WAVE QUALITY (1 - 5)
          </Text>
          <View style={styles.pillsRow}>
            {[1, 2, 3, 4, 5].map((q) => (
              <Pressable
                key={q}
                onPress={async () => {
                  await haptics.selection();
                  setWaveQuality(q);
                }}
                style={[
                  styles.pillButton,
                  {
                    backgroundColor: waveQuality === q ? '#0284C7' : theme.surface,
                    borderColor: waveQuality === q ? '#0284C7' : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.labelBold,
                    { color: waveQuality === q ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {q}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Energy Level Selector */}
        <View style={styles.inputGroup}>
          <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 6 }]}>
            PADDLE ENERGY & STAMINA ({energyLevel}/10)
          </Text>
          <View style={styles.pillsRow}>
            {[2, 4, 6, 8, 10].map((e) => (
              <Pressable
                key={e}
                onPress={async () => {
                  await haptics.selection();
                  setEnergyLevel(e);
                }}
                style={[
                  styles.pillButton,
                  {
                    backgroundColor: energyLevel === e ? theme.primary : theme.surface,
                    borderColor: energyLevel === e ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.labelBold,
                    { color: energyLevel === e ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {e}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
            SESSION NOTES & SWELL OBSERVATIONS
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Tide phase, wind, crowd, peak shape..."
            placeholderTextColor={theme.textMuted}
            multiline
            style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
          />
        </View>

        <Button
          title="Save Surf Session"
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
  inputGroup: {
    marginBottom: Spacing.md,
  },
  textInput: {
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pillButton: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
