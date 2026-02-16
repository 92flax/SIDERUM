import { useState, useRef, useCallback } from 'react';
import { Text, View, StyleSheet, Dimensions, Platform, Pressable, FlatList, ViewToken } from 'react-native';
import Svg, { Circle, Line, Path, G, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingProps {
  onComplete: () => void;
}

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: 'stars' | 'compass' | 'rune';
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    title: 'Welcome to \u00c6ONIS',
    subtitle: 'Your Cosmic Command Center',
    description: 'A professional-grade ritual and astrological toolkit. Real-time planetary positions, Essential Dignities, Aspects, and Event Horizon predictions at your fingertips.',
    icon: 'stars',
  },
  {
    id: 'calibration',
    title: 'AR Calibration',
    subtitle: 'Hold Phone at Horizon',
    description: 'The Ritual Compass uses your device sensors to track celestial bodies in real-time. Hold your phone level at the horizon for best results. Tilt up to see planets above, down for those below.',
    icon: 'compass',
  },
  {
    id: 'intent',
    title: 'Set Your Intent',
    subtitle: 'Banish or Invoke',
    description: 'Every ritual begins with intent. Choose BANISH to clear unwanted energies (Earth \u2192 Spirit) or INVOKE to draw power inward (Spirit \u2192 Earth). The pentagram direction changes accordingly.',
    icon: 'rune',
  },
];

// ===== Animated Icons =====
function StarsIcon() {
  const pulse = useSharedValue(0.6);

  useState(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <View style={iconStyles.container}>
      <Animated.View style={glowStyle}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          {/* Central star */}
          <Circle cx={60} cy={60} r={4} fill="#D4AF37" />
          <Circle cx={60} cy={60} r={12} fill="none" stroke="#D4AF3740" strokeWidth={1} />
          <Circle cx={60} cy={60} r={24} fill="none" stroke="#D4AF3720" strokeWidth={0.5} />
          {/* Orbiting planets */}
          <Circle cx={38} cy={42} r={3} fill="#00FFFF" />
          <Circle cx={82} cy={55} r={2.5} fill="#FF6B6B" />
          <Circle cx={50} cy={85} r={2} fill="#FFD700" />
          <Circle cx={75} cy={35} r={2} fill="#8B5CF6" />
          {/* Constellation lines */}
          <Line x1={38} y1={42} x2={60} y2={60} stroke="#D4AF3720" strokeWidth={0.5} />
          <Line x1={82} y1={55} x2={60} y2={60} stroke="#D4AF3720" strokeWidth={0.5} />
          <Line x1={50} y1={85} x2={60} y2={60} stroke="#D4AF3720" strokeWidth={0.5} />
          <Line x1={75} y1={35} x2={60} y2={60} stroke="#D4AF3720" strokeWidth={0.5} />
          {/* Outer ring */}
          <Circle cx={60} cy={60} r={50} fill="none" stroke="#1A1A1A" strokeWidth={1} strokeDasharray="3,5" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function CompassIcon() {
  const rotate = useSharedValue(0);

  useState(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  });

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <View style={iconStyles.container}>
      <Svg width={120} height={120} viewBox="0 0 120 120">
        {/* Outer ring */}
        <Circle cx={60} cy={60} r={50} fill="none" stroke="#1A1A1A" strokeWidth={1.5} />
        <Circle cx={60} cy={60} r={45} fill="none" stroke="#1A1A1A" strokeWidth={0.5} />
        {/* Cardinal marks */}
        <SvgText x={60} y={18} fill="#D4AF37" fontSize={14} fontWeight="bold" textAnchor="middle">N</SvgText>
        <SvgText x={60} y={110} fill="#6B6B6B" fontSize={12} textAnchor="middle">S</SvgText>
        <SvgText x={105} y={64} fill="#6B6B6B" fontSize={12} textAnchor="middle">E</SvgText>
        <SvgText x={15} y={64} fill="#6B6B6B" fontSize={12} textAnchor="middle">W</SvgText>
        {/* Compass needle */}
        <Path d="M 60 25 L 55 60 L 60 55 L 65 60 Z" fill="#D4AF37" opacity={0.9} />
        <Path d="M 60 95 L 55 60 L 60 65 L 65 60 Z" fill="#6B6B6B" opacity={0.5} />
        {/* Center */}
        <Circle cx={60} cy={60} r={3} fill="#D4AF37" />
      </Svg>
    </View>
  );
}

// Need to import SvgText
import { Text as SvgText } from 'react-native-svg';

function RuneIcon() {
  const glow = useSharedValue(0.4);

  useState(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View style={iconStyles.container}>
      <Animated.View style={glowStyle}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          {/* Central stave */}
          <Line x1={60} y1={20} x2={60} y2={100} stroke="#E0E0E0" strokeWidth={4} strokeLinecap="square" />
          {/* Fehu-like branches */}
          <Line x1={60} y1={35} x2={85} y2={25} stroke="#D4AF37" strokeWidth={3} strokeLinecap="square" />
          <Line x1={60} y1={50} x2={80} y2={40} stroke="#D4AF37" strokeWidth={3} strokeLinecap="square" />
          {/* Gebo X overlay */}
          <Line x1={40} y1={55} x2={80} y2={85} stroke="#00FFFF" strokeWidth={2.5} strokeLinecap="square" opacity={0.7} />
          <Line x1={80} y1={55} x2={40} y2={85} stroke="#00FFFF" strokeWidth={2.5} strokeLinecap="square" opacity={0.7} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  container: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
});

// ===== Main Onboarding Component =====
export function OnboardingScreen({ onComplete }: OnboardingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (Platform.OS !== ('web' as string)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      if (Platform.OS !== ('web' as string)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onComplete();
    }
  };

  const handleSkip = () => {
    if (Platform.OS !== ('web' as string)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onComplete();
  };

  const renderIcon = (icon: string) => {
    switch (icon) {
      case 'stars': return <StarsIcon />;
      case 'compass': return <CompassIcon />;
      case 'rune': return <RuneIcon />;
      default: return null;
    }
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        {/* Animated Icon */}
        <View style={styles.iconWrapper}>
          {renderIcon(item.icon)}
        </View>

        {/* Text */}
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    </View>
  );

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {!isLastSlide && (
        <Pressable
          onPress={handleSkip}
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next / Enter button */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextBtn,
            isLastSlide && styles.nextBtnFinal,
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={[styles.nextBtnText, isLastSlide && styles.nextBtnTextFinal]}>
            {isLastSlide ? 'Enter \u00c6ONIS' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  skipBtn: {
    position: 'absolute', top: 60, right: 24, zIndex: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  skipText: { fontSize: 14, color: '#6B6B6B' },
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  slideContent: { alignItems: 'center', paddingHorizontal: 40 },
  iconWrapper: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center', marginBottom: 40,
  },
  slideTitle: {
    fontFamily: 'Cinzel', fontSize: 26, color: '#D4AF37',
    textAlign: 'center', letterSpacing: 3,
  },
  slideSubtitle: {
    fontFamily: 'JetBrainsMono', fontSize: 11, color: '#6B6B6B',
    textAlign: 'center', letterSpacing: 2, marginTop: 8, textTransform: 'uppercase',
  },
  slideDescription: {
    fontSize: 14, color: '#E0E0E0', textAlign: 'center',
    lineHeight: 22, marginTop: 20, maxWidth: 300,
  },
  bottomSection: {
    paddingBottom: 60, paddingHorizontal: 32, alignItems: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#1A1A1A',
  },
  dotActive: { backgroundColor: '#D4AF37', width: 24 },
  nextBtn: {
    width: '100%', paddingVertical: 16, borderRadius: 24,
    borderWidth: 1, borderColor: '#D4AF3740', alignItems: 'center',
  },
  nextBtnFinal: { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
  nextBtnText: { fontSize: 16, fontWeight: '600', color: '#D4AF37', letterSpacing: 1 },
  nextBtnTextFinal: { color: '#050505' },
});
