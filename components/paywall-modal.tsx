// ============================================================
// SIDERUM – Paywall Modal ("Upgrade to Adeptus")
// Sleek modal with benefits list and upgrade CTA
// ============================================================

import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useProStore, PRO_FEATURES } from '@/lib/store/pro-store';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  featureId?: string; // Which feature triggered the paywall
}

const BENEFITS = [
  { icon: '🔭', title: 'Event Horizon', desc: 'Search eclipses, retrogrades & conjunctions for 5 years' },
  { icon: '📖', title: 'Advanced Rituals', desc: 'Hexagram, Rose Cross, Star Ruby & more' },
  { icon: 'ᚠ', title: 'Unlimited Bindrunes', desc: 'No limit on rune combinations' },
  { icon: '⚹', title: 'Aspectarian', desc: 'Deep planetary aspect analysis' },
  { icon: '⚡', title: 'Priority Updates', desc: 'Early access to new features' },
];

export function PaywallModal({ visible, onClose, featureId }: PaywallModalProps) {
  const upgradeToPro = useProStore((s) => s.upgradeToPro);
  const tier = useProStore((s) => s.tier);

  const triggeredFeature = featureId
    ? PRO_FEATURES.find(f => f.id === featureId)
    : null;

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const handleUpgrade = async () => {
    if (Platform.OS !== ('web' as string)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // In production: RevenueCat purchase flow with selectedPlan
    await upgradeToPro();
    onClose();
  };

  const handleRestore = async () => {
    if (Platform.OS !== ('web' as string)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // In production: RevenueCat restore purchases
    await upgradeToPro();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.title}>SIDERUM Adeptus</Text>
            <Text style={styles.subtitle}>Unlock the Full Grimoire</Text>

            {/* Triggered feature highlight */}
            {triggeredFeature && (
              <View style={styles.triggerCard}>
                <Text style={styles.triggerLabel}>You tried to access:</Text>
                <Text style={styles.triggerName}>{triggeredFeature.name}</Text>
                <Text style={styles.triggerDesc}>{triggeredFeature.description}</Text>
              </View>
            )}

            {/* Benefits list */}
            <View style={styles.benefitsList}>
              {BENEFITS.map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Text style={styles.benefitIcon}>{b.icon}</Text>
                  <View style={styles.benefitInfo}>
                    <Text style={styles.benefitTitle}>{b.title}</Text>
                    <Text style={styles.benefitDesc}>{b.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Pricing Options */}
            <View style={styles.pricingContainer}>
              {/* Yearly – Best Value */}
              <Pressable
                onPress={() => {
                  setSelectedPlan('yearly');
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  styles.pricingCard,
                  selectedPlan === 'yearly' && styles.pricingCardSelected,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </View>
                <Text style={styles.pricingLabel}>Yearly</Text>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingAmount}>$39.99</Text>
                  <Text style={styles.pricingPeriod}>/year</Text>
                </View>
                <Text style={styles.pricingNote}>$3.33/month · Save 33%</Text>
              </Pressable>

              {/* Monthly */}
              <Pressable
                onPress={() => {
                  setSelectedPlan('monthly');
                  if (Platform.OS !== ('web' as string)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  styles.pricingCard,
                  selectedPlan === 'monthly' && styles.pricingCardSelected,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.pricingLabel}>Monthly</Text>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingAmount}>$4.99</Text>
                  <Text style={styles.pricingPeriod}>/month</Text>
                </View>
                <Text style={styles.pricingNote}>Cancel anytime · 7-day free trial</Text>
              </Pressable>
            </View>

            {/* CTA */}
            <Pressable
              onPress={handleUpgrade}
              style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.upgradeBtnText}>Upgrade to Adeptus</Text>
            </Pressable>

            {/* Restore */}
            <Pressable
              onPress={handleRestore}
              style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.restoreBtnText}>Restore Purchase</Text>
            </Pressable>

            {/* Close */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.closeBtnText}>Not Now</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Gold Padlock Badge – shown on locked features
 */
export function ProBadge({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.proBadge, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.proBadgeIcon}>🔒</Text>
      <Text style={styles.proBadgeText}>PRO</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#D4AF3730',
    maxHeight: '90%',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    color: '#D4AF37',
    letterSpacing: 3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    marginTop: 4,
    textAlign: 'center',
  },
  triggerCard: {
    backgroundColor: '#D4AF3708',
    borderWidth: 1,
    borderColor: '#D4AF3720',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  triggerLabel: {
    fontSize: 11,
    color: '#6B6B6B',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  triggerName: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    color: '#D4AF37',
    marginTop: 4,
  },
  triggerDesc: {
    fontSize: 12,
    color: '#E0E0E0',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  benefitsList: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  benefitInfo: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  benefitDesc: {
    fontSize: 11,
    color: '#6B6B6B',
    marginTop: 1,
    lineHeight: 16,
  },
  pricingContainer: {
    width: '100%',
    marginTop: 24,
    gap: 10,
  },
  pricingCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  pricingCardSelected: {
    borderColor: '#D4AF37',
    borderWidth: 2,
    backgroundColor: '#D4AF3708',
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
  },
  bestValueText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
    fontWeight: '700',
    color: '#050505',
    letterSpacing: 1,
  },
  pricingLabel: {
    fontSize: 11,
    color: '#6B6B6B',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  pricingAmount: {
    fontFamily: 'Cinzel',
    fontSize: 32,
    color: '#D4AF37',
  },
  pricingPeriod: {
    fontSize: 14,
    color: '#6B6B6B',
    marginLeft: 4,
  },
  pricingNote: {
    fontSize: 11,
    color: '#6B6B6B',
    marginTop: 6,
  },
  upgradeBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: '#050505',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  restoreBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  restoreBtnText: {
    fontSize: 13,
    color: '#6B6B6B',
    textDecorationLine: 'underline',
  },
  closeBtn: {
    marginTop: 8,
    paddingVertical: 8,
  },
  closeBtnText: {
    fontSize: 14,
    color: '#6B6B6B',
  },
  // Pro Badge
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF3715',
    borderWidth: 1,
    borderColor: '#D4AF3730',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  proBadgeIcon: {
    fontSize: 10,
  },
  proBadgeText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
    color: '#D4AF37',
    fontWeight: '700',
    letterSpacing: 1,
  },
});
