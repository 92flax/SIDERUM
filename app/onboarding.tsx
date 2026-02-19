// ============================================================
// ÆONIS – Onboarding Route
// Proper Expo Router screen for the onboarding flow.
// No tab bar is shown. On completion, navigates to main app.
// ============================================================

import { useCallback } from 'react';
import { router } from 'expo-router';
import { AdeptsSeal } from '@/components/adepts-seal';

export default function OnboardingScreen() {
  const handleComplete = useCallback(() => {
    // Navigate to main tabs, replacing the onboarding route
    // so the user cannot go back to it
    router.replace('/(tabs)');
  }, []);

  return <AdeptsSeal onComplete={handleComplete} />;
}
