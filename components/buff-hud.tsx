// ============================================================
// ÆONIS – RPG-Style Buff HUD (Active Buffs / Status Effects)
// Replaces the old Alignment Card with an additive buff list
// and a Mana/Energy style potency bar.
// ============================================================

import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { AstralPotencyReport, PotencyBuff } from '@/lib/astro/potency-engine';
import { useRouter } from 'expo-router';

interface BuffHudProps {
  report: AstralPotencyReport;
}

export function BuffHud({ report }: BuffHudProps) {
  const router = useRouter();
  const activeBuffs = report.buffs.filter(b => b.active);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerLabel}>STATUS EFFECTS</Text>
        <Text style={[s.headerPotency, { color: report.planetColor }]}>
          {report.potencyScore}% POTENCY
        </Text>
      </View>

      {/* Buff List */}
      <View style={s.buffList}>
        {activeBuffs.map((buff) => (
          <BuffRow key={buff.id} buff={buff} />
        ))}
      </View>

      {/* Mana Bar */}
      <View style={s.manaBarSection}>
        <View style={s.manaBarTrack}>
          {/* Background glow at 60% base */}
          <View style={[s.manaBarBase, { width: '60%' }]} />
          {/* Active fill */}
          <View
            style={[
              s.manaBarFill,
              {
                width: `${report.potencyScore}%`,
                backgroundColor: report.potencyScore >= 85 ? '#D4AF37' : report.potencyScore >= 75 ? '#3B82F6' : '#A3A3A3',
              },
            ]}
          />
        </View>
        <Text style={[s.manaBarLabel, {
          color: report.potencyScore >= 85 ? '#D4AF37' : report.potencyScore >= 75 ? '#3B82F6' : '#A3A3A3',
        }]}>
          {report.potencyScore}%
        </Text>
      </View>

      {/* Headline */}
      <Text style={[s.headline, { color: report.planetColor }]}>
        {report.headline}
      </Text>

      {/* Quick Action */}
      {report.suggestedRitualId && (
        <Pressable
          onPress={() => {
            if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(tabs)/sanctum');
          }}
          style={({ pressed }) => [
            s.actionBtn,
            { borderColor: report.planetColor + '60' },
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={[s.actionText, { color: report.planetColor }]}>
            Begin Ritual →
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function BuffRow({ buff }: { buff: PotencyBuff }) {
  const valueText = buff.isBase
    ? `BASE ${buff.value}%`
    : `+ ${buff.value}%`;

  return (
    <View style={s.buffRow}>
      <View style={[s.buffTag, { backgroundColor: buff.color + '15', borderColor: buff.color + '40' }]}>
        <Text style={[s.buffValue, { color: buff.color }]}>{valueText}</Text>
      </View>
      <Text style={[s.buffName, buff.isBase && { color: '#A3A3A3' }]}>
        {buff.label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLabel: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#6B6B6B',
    letterSpacing: 2,
  },
  headerPotency: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  buffList: {
    gap: 8,
    marginBottom: 16,
  },
  buffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buffTag: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 90,
    alignItems: 'center',
  },
  buffValue: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  buffName: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    color: '#E0E0E0',
    letterSpacing: 1,
    flex: 1,
  },
  manaBarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  manaBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  manaBarBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#A3A3A320',
    borderRadius: 4,
  },
  manaBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  manaBarLabel: {
    fontFamily: 'JetBrainsMono',
    fontSize: 18,
    fontWeight: '700',
    width: 52,
    textAlign: 'right',
  },
  headline: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 10,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  actionText: {
    fontFamily: 'Cinzel',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
