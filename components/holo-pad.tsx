// ============================================================
// SIDERUM – Holo-Pad: Interactive Tracing Area for Rituals
// Renders target shapes as glowing dashed lines with
// numbered stroke-order arrows and success animation
// ============================================================

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import Svg, { Circle, Line, Path, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface HoloPadProps {
  shape: string;          // e.g. "Pentagram", "Hexagram", "Cross", "Circle"
  colorHex: string;       // e.g. "#3B82F6"
  isTraced: boolean;      // Whether the user has completed tracing
  onSimulateTrace?: () => void;  // Web fallback
}

// Pentagram vertices (5 points, starting from top)
function getPentagramPoints(cx: number, cy: number, r: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI / 2) + (i * 2 * Math.PI / 5);
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
    });
  }
  return points;
}

// Banishing Earth Pentagram stroke order: 0→2→4→1→3→0
const PENTAGRAM_ORDER = [0, 2, 4, 1, 3, 0];

// Hexagram (Star of David) - two overlapping triangles
function getHexagramTriangles(cx: number, cy: number, r: number) {
  const up: Array<{ x: number; y: number }> = [];
  const down: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 3; i++) {
    const upAngle = (Math.PI / 2) + (i * 2 * Math.PI / 3);
    up.push({ x: cx + r * Math.cos(upAngle), y: cy - r * Math.sin(upAngle) });
    const downAngle = -(Math.PI / 2) + (i * 2 * Math.PI / 3);
    down.push({ x: cx + r * Math.cos(downAngle), y: cy - r * Math.sin(downAngle) });
  }
  return { up, down };
}

// Cross shape
function getCrossLines(cx: number, cy: number, r: number) {
  return [
    { x1: cx, y1: cy - r, x2: cx, y2: cy + r },     // vertical
    { x1: cx - r * 0.7, y1: cy - r * 0.3, x2: cx + r * 0.7, y2: cy - r * 0.3 }, // horizontal
  ];
}

export function HoloPad({ shape, colorHex, isTraced, onSimulateTrace }: HoloPadProps) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  // Glow pulse animation
  const glowOpacity = useSharedValue(0.3);
  const successScale = useSharedValue(1);

  useEffect(() => {
    if (isTraced) {
      // Success pulse
      successScale.value = withSequence(
        withTiming(1.08, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.cubic) }),
      );
      glowOpacity.value = withTiming(1, { duration: 300 });
    } else {
      // Idle glow pulse
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
      successScale.value = 1;
    }
  }, [isTraced]);

  const animatedContainer = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  const animatedGlow = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const renderShape = () => {
    const strokeColor = isTraced ? '#D4AF37' : colorHex;
    const strokeDash = isTraced ? undefined : '6,4';
    const strokeWidth = isTraced ? 2.5 : 1.5;
    const strokeOpacity = isTraced ? 1 : 0.7;

    switch (shape) {
      case 'Pentagram': {
        const pts = getPentagramPoints(cx, cy, r);
        const segments: React.JSX.Element[] = [];

        for (let i = 0; i < PENTAGRAM_ORDER.length - 1; i++) {
          const from = pts[PENTAGRAM_ORDER[i]];
          const to = pts[PENTAGRAM_ORDER[i + 1]];
          segments.push(
            <Line
              key={`seg-${i}`}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
              opacity={strokeOpacity}
              strokeLinecap="round"
            />
          );

          // Numbered arrow at midpoint
          if (!isTraced) {
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            segments.push(
              <G key={`num-${i}`}>
                <Circle cx={mx} cy={my} r={8} fill="#050505" stroke={colorHex} strokeWidth={0.5} opacity={0.9} />
                <SvgText x={mx} y={my + 4} fontSize={9} fill={colorHex} textAnchor="middle">
                  {i + 1}
                </SvgText>
              </G>
            );
          }
        }

        return <>{segments}</>;
      }

      case 'Hexagram': {
        const { up, down } = getHexagramTriangles(cx, cy, r);
        const upPath = `M ${up[0].x} ${up[0].y} L ${up[1].x} ${up[1].y} L ${up[2].x} ${up[2].y} Z`;
        const downPath = `M ${down[0].x} ${down[0].y} L ${down[1].x} ${down[1].y} L ${down[2].x} ${down[2].y} Z`;
        return (
          <>
            <Path d={upPath} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDash} fill="none" opacity={strokeOpacity} />
            <Path d={downPath} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDash} fill="none" opacity={strokeOpacity} />
          </>
        );
      }

      case 'Cross': {
        const lines = getCrossLines(cx, cy, r);
        return (
          <>
            {lines.map((l, i) => (
              <Line
                key={`cross-${i}`}
                x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={strokeColor} strokeWidth={strokeWidth}
                strokeDasharray={strokeDash} opacity={strokeOpacity}
                strokeLinecap="round"
              />
            ))}
          </>
        );
      }

      default: {
        // Circle fallback
        return (
          <Circle
            cx={cx} cy={cy} r={r}
            stroke={strokeColor} strokeWidth={strokeWidth}
            strokeDasharray={strokeDash} fill="none" opacity={strokeOpacity}
          />
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.padOuter, animatedContainer]}>
        {/* Background glow */}
        <Animated.View style={[styles.glowBg, { backgroundColor: colorHex + '08' }, animatedGlow]} />

        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Subtle grid lines for spatial reference */}
          <Line x1={cx} y1={0} x2={cx} y2={size} stroke="#1A1A1A" strokeWidth={0.5} />
          <Line x1={0} y1={cy} x2={size} y2={cy} stroke="#1A1A1A" strokeWidth={0.5} />
          <Circle cx={cx} cy={cy} r={r + 10} stroke="#1A1A1A" strokeWidth={0.5} fill="none" />

          {/* The shape */}
          {renderShape()}
        </Svg>

        {/* Status label */}
        <View style={[styles.statusBadge, isTraced && { borderColor: '#D4AF3760', backgroundColor: '#D4AF3710' }]}>
          <Text style={[styles.statusText, isTraced && { color: '#D4AF37' }]}>
            {isTraced ? '✦ Shape Sealed' : `Trace: ${shape}`}
          </Text>
        </View>
      </Animated.View>

      {/* Simulate button for web */}
      {Platform.OS === ('web' as string) && !isTraced && onSimulateTrace && (
        <Pressable
          onPress={onSimulateTrace}
          style={({ pressed }) => [styles.simBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.simBtnText}>Simulate Trace</Text>
        </Pressable>
      )}
    </View>
  );
}

// Simple SVG text component (react-native-svg Text)
function SvgText({ x, y, fontSize, fill, textAnchor, children }: any) {
  // Use react-native-svg Text
  const RNSvgText = require('react-native-svg').Text;
  return (
    <RNSvgText x={x} y={y} fontSize={fontSize} fill={fill} textAnchor={textAnchor}>
      {children}
    </RNSvgText>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  padOuter: {
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glowBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    backgroundColor: '#0D0D0D',
  },
  statusText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#6B6B6B',
    letterSpacing: 1,
  },
  simBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 12,
  },
  simBtnText: {
    fontSize: 13,
    color: '#E0E0E0',
  },
});
