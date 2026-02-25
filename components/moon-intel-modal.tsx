// ============================================================
// ÆONIS – Moon Intel Modal
// Dark-themed modal showing moon phase details, zodiac position,
// and magickal affinity for the current lunar phase.
// ============================================================

import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from 'react-native';

export interface MoonIntelData {
  phaseName: string;
  illumination: number;
  emoji: string;
  zodiacSign?: string;
  zodiacSymbol?: string;
  zodiacDegree?: string;
}

interface MoonIntelModalProps {
  visible: boolean;
  onClose: () => void;
  data: MoonIntelData | null;
}

// ─── Magickal Affinity by Phase ─────────────────────────────

const PHASE_AFFINITY: Record<string, { intents: string[]; description: string }> = {
  'New Moon': {
    intents: ['Banishment', 'New Beginnings', 'Shadow Work'],
    description: 'The void of the New Moon is optimal for banishing unwanted influences, setting intentions for new cycles, and deep introspective shadow work. The darkness amplifies Saturnian severance.',
  },
  'Waxing Crescent': {
    intents: ['Intention Setting', 'Growth', 'Attraction'],
    description: 'As the first sliver of light returns, channel this energy into planting seeds of intention. Ideal for attraction spells and initiating new projects under growing lunar power.',
  },
  'First Quarter': {
    intents: ['Action', 'Courage', 'Overcoming Obstacles'],
    description: 'The Half Moon demands decisive action. Martial energy is amplified. Use this phase to break through barriers and commit fully to your magickal workings.',
  },
  'Waxing Gibbous': {
    intents: ['Refinement', 'Patience', 'Amplification'],
    description: 'Nearly full, the moon amplifies existing workings. Refine your rituals, adjust your approach, and prepare for the culmination of power at the Full Moon.',
  },
  'Full Moon': {
    intents: ['Invocation', 'Divination', 'Maximum Power'],
    description: 'The Full Moon is the apex of lunar power. All forms of invocation, divination, and ceremonial magick reach peak potency. Scrying, astral projection, and communion with higher forces are supremely favored.',
  },
  'Waning Gibbous': {
    intents: ['Gratitude', 'Sharing', 'Teaching'],
    description: 'The disseminating moon favors sharing wisdom and expressing gratitude for received blessings. Ideal for teaching, mentoring, and distributing accumulated magickal knowledge.',
  },
  'Last Quarter': {
    intents: ['Release', 'Forgiveness', 'Breaking Habits'],
    description: 'The waning half moon is a powerful time for release work. Break free from toxic patterns, forgive old wounds, and sever energetic cords that no longer serve your ascent.',
  },
  'Waning Crescent': {
    intents: ['Rest', 'Surrender', 'Preparation'],
    description: 'The Balsamic Moon whispers of endings and rest. Surrender to the void, recuperate your astral reserves, and prepare your temple for the coming New Moon cycle.',
  },
};

function getPhaseAffinity(phaseName: string): { intents: string[]; description: string } {
  // Try exact match first, then partial match
  if (PHASE_AFFINITY[phaseName]) return PHASE_AFFINITY[phaseName];
  const lower = phaseName.toLowerCase();
  if (lower.includes('new')) return PHASE_AFFINITY['New Moon'];
  if (lower.includes('full')) return PHASE_AFFINITY['Full Moon'];
  if (lower.includes('waxing') && lower.includes('crescent')) return PHASE_AFFINITY['Waxing Crescent'];
  if (lower.includes('first') || (lower.includes('waxing') && lower.includes('quarter'))) return PHASE_AFFINITY['First Quarter'];
  if (lower.includes('waxing') && lower.includes('gibbous')) return PHASE_AFFINITY['Waxing Gibbous'];
  if (lower.includes('waning') && lower.includes('gibbous')) return PHASE_AFFINITY['Waning Gibbous'];
  if (lower.includes('last') || lower.includes('third') || (lower.includes('waning') && lower.includes('quarter'))) return PHASE_AFFINITY['Last Quarter'];
  if (lower.includes('waning') && lower.includes('crescent')) return PHASE_AFFINITY['Waning Crescent'];
  return { intents: ['General Practice'], description: 'The current lunar phase supports general magickal practice.' };
}

export function MoonIntelModal({ visible, onClose, data }: MoonIntelModalProps) {
  if (!data) return null;

  const affinity = getPhaseAffinity(data.phaseName);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.content} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.handle} />

            {/* Phase Name */}
            <Text style={s.moonEmoji}>{data.emoji}</Text>
            <Text style={s.phaseName}>{data.phaseName}</Text>

            {/* Current State Section */}
            <View style={s.section}>
              <Text style={s.sectionHeader}>[ CURRENT STATE ]</Text>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>ILLUMINATION</Text>
                <Text style={s.detailValue}>{data.illumination.toFixed(1)}%</Text>
              </View>
              {data.zodiacSign && (
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>ZODIAC</Text>
                  <Text style={s.detailValue}>
                    {data.zodiacSymbol ? `${data.zodiacSymbol} ` : ''}{data.zodiacSign}
                    {data.zodiacDegree ? ` ${data.zodiacDegree}` : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Magickal Affinity Section */}
            <View style={s.section}>
              <Text style={s.sectionHeader}>[ MAGICKAL AFFINITY ]</Text>
              <View style={s.intentRow}>
                {affinity.intents.map((intent, i) => (
                  <View key={i} style={s.intentTag}>
                    <Text style={s.intentText}>{intent.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.affinityDesc}>{affinity.description}</Text>
            </View>

            {/* Close */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={s.closeBtnText}>Close</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#C0C0C020',
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginBottom: 20,
  },
  moonEmoji: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 8,
  },
  phaseName: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    color: '#C0C0C0',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#D4AF37',
    letterSpacing: 2,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  detailLabel: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#6B6B6B',
    letterSpacing: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#E0E0E0',
    fontWeight: '600',
  },
  intentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  intentTag: {
    backgroundColor: '#C0C0C010',
    borderWidth: 1,
    borderColor: '#C0C0C030',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  intentText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#C0C0C0',
    letterSpacing: 1,
    fontWeight: '700',
  },
  affinityDesc: {
    fontSize: 13,
    color: '#A3A3A3',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  closeBtn: {
    backgroundColor: '#C0C0C0',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  closeBtnText: {
    color: '#050505',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
