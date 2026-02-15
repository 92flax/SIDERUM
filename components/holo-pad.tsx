// ============================================================
// SIDERUM – Holo-Pad: Interactive Tracing Area for Rituals
// Ghost Guide particle animation, breathing path, sparkler trail
// ============================================================

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import Svg, { Circle, Line, Path, G, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface HoloPadProps {
  shape: string;          // e.g. "Pentagram", "Hexagram", "Cross", "Circle"
  colorHex: string;       // e.g. "#3B82F6"
  isTraced: boolean;      // Whether the user has completed tracing
  onSimulateTrace?: () => void;  // Web fallback
}

// ---- Geometry helpers ----

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

const PENTAGRAM_ORDER = [0, 2, 4, 1, 3, 0];

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

function getCrossLines(cx: number, cy: number, r: number) {
  return [
    { x1: cx, y1: cy - r, x2: cx, y2: cy + r },
    { x1: cx - r * 0.7, y1: cy - r * 0.3, x2: cx + r * 0.7, y2: cy - r * 0.3 },
  ];
}

// Get all line segments for the shape (for ghost particle path)
function getShapeSegments(shape: string, cx: number, cy: number, r: number): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  switch (shape) {
    case 'Pentagram': {
      const pts = getPentagramPoints(cx, cy, r);
      const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
      for (let i = 0; i < PENTAGRAM_ORDER.length - 1; i++) {
        const from = pts[PENTAGRAM_ORDER[i]];
        const to = pts[PENTAGRAM_ORDER[i + 1]];
        segs.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
      }
      return segs;
    }
    case 'Hexagram': {
      const { up, down } = getHexagramTriangles(cx, cy, r);
      return [
        { x1: up[0].x, y1: up[0].y, x2: up[1].x, y2: up[1].y },
        { x1: up[1].x, y1: up[1].y, x2: up[2].x, y2: up[2].y },
        { x1: up[2].x, y1: up[2].y, x2: up[0].x, y2: up[0].y },
        { x1: down[0].x, y1: down[0].y, x2: down[1].x, y2: down[1].y },
        { x1: down[1].x, y1: down[1].y, x2: down[2].x, y2: down[2].y },
        { x1: down[2].x, y1: down[2].y, x2: down[0].x, y2: down[0].y },
      ];
    }
    case 'Cross': {
      return getCrossLines(cx, cy, r);
    }
    default: {
      // Circle: approximate with 12 segments
      const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
      for (let i = 0; i < 12; i++) {
        const a1 = (i / 12) * Math.PI * 2;
        const a2 = ((i + 1) / 12) * Math.PI * 2;
        segs.push({
          x1: cx + r * Math.cos(a1), y1: cy + r * Math.sin(a1),
          x2: cx + r * Math.cos(a2), y2: cy + r * Math.sin(a2),
        });
      }
      return segs;
    }
  }
}

// Calculate total path length
function totalPathLength(segments: Array<{ x1: number; y1: number; x2: number; y2: number }>): number {
  return segments.reduce((sum, s) => {
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);
}

// Get position along path at a given fraction (0-1)
function getPointOnPath(
  segments: Array<{ x1: number; y1: number; x2: number; y2: number }>,
  fraction: number,
  total: number,
): { x: number; y: number } {
  const targetDist = fraction * total;
  let accumulated = 0;

  for (const seg of segments) {
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (accumulated + segLen >= targetDist) {
      const remaining = targetDist - accumulated;
      const t = segLen > 0 ? remaining / segLen : 0;
      return {
        x: seg.x1 + dx * t,
        y: seg.y1 + dy * t,
      };
    }
    accumulated += segLen;
  }

  // Fallback: return last point
  const last = segments[segments.length - 1];
  return { x: last?.x2 ?? 0, y: last?.y2 ?? 0 };
}

// ---- Sparkler Trail Point ----
interface TrailPoint {
  x: number;
  y: number;
  age: number;
  id: number;
}

export function HoloPad({ shape, colorHex, isTraced, onSimulateTrace }: HoloPadProps) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  // Ghost particle animation state
  const [ghostFraction, setGhostFraction] = useState(0);
  const ghostTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Trail state for finger tracking
  const [trailPoints, setTrailPoints] = useState<TrailPoint[]>([]);
  const trailIdRef = useRef(0);
  const trailTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reanimated values
  const glowOpacity = useSharedValue(0.3);
  const successScale = useSharedValue(1);
  const breathOpacity = useSharedValue(0.5);

  // Shape segments and total length
  const segments = useMemo(() => getShapeSegments(shape, cx, cy, r), [shape, cx, cy, r]);
  const pathTotal = useMemo(() => totalPathLength(segments), [segments]);

  // Ghost particle position
  const ghostPos = useMemo(() => getPointOnPath(segments, ghostFraction, pathTotal), [segments, ghostFraction, pathTotal]);

  // Ghost particle animation loop (~4s for full trace)
  useEffect(() => {
    if (isTraced) {
      if (ghostTimer.current) clearInterval(ghostTimer.current);
      return;
    }

    const GHOST_DURATION = 4000; // 4 seconds
    const TICK = 30; // ~33fps
    const step = TICK / GHOST_DURATION;

    ghostTimer.current = setInterval(() => {
      setGhostFraction(prev => {
        const next = prev + step;
        return next >= 1 ? 0 : next;
      });
    }, TICK);

    return () => {
      if (ghostTimer.current) clearInterval(ghostTimer.current);
    };
  }, [isTraced]);

  // Breathing path opacity animation
  useEffect(() => {
    if (isTraced) {
      breathOpacity.value = withTiming(1, { duration: 300 });
    } else {
      breathOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }
  }, [isTraced]);

  // Success animation
  useEffect(() => {
    if (isTraced) {
      successScale.value = withSequence(
        withTiming(1.08, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.cubic) }),
      );
      glowOpacity.value = withTiming(1, { duration: 300 });
    } else {
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

  // Trail aging timer
  useEffect(() => {
    trailTimerRef.current = setInterval(() => {
      setTrailPoints(prev => {
        const updated = prev.map(p => ({ ...p, age: p.age + 1 })).filter(p => p.age < 15);
        return updated;
      });
    }, 50);
    return () => {
      if (trailTimerRef.current) clearInterval(trailTimerRef.current);
    };
  }, []);

  const animatedContainer = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  const animatedGlow = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // PanResponder for sparkler trail
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isTraced,
    onMoveShouldSetPanResponder: () => !isTraced,
    onPanResponderMove: (evt: GestureResponderEvent) => {
      const touch = evt.nativeEvent;
      // Offset by padding (12px) to get SVG coordinates
      const x = touch.locationX - 12;
      const y = touch.locationY - 12;
      if (x >= 0 && x <= size && y >= 0 && y <= size) {
        trailIdRef.current += 1;
        setTrailPoints(prev => [
          ...prev.slice(-30), // Keep max 30 points
          { x, y, age: 0, id: trailIdRef.current },
        ]);
      }
    },
    onPanResponderRelease: () => {
      // Fade out trail naturally
    },
  }), [isTraced, size]);

  const renderShape = () => {
    const strokeColor = isTraced ? '#D4AF37' : colorHex;
    const strokeWidth = isTraced ? 3 : 2;

    switch (shape) {
      case 'Pentagram': {
        const pts = getPentagramPoints(cx, cy, r);
        const elements: React.JSX.Element[] = [];

        for (let i = 0; i < PENTAGRAM_ORDER.length - 1; i++) {
          const from = pts[PENTAGRAM_ORDER[i]];
          const to = pts[PENTAGRAM_ORDER[i + 1]];

          // Glow layer
          elements.push(
            <Line
              key={`glow-${i}`}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={isTraced ? '#D4AF37' : colorHex}
              strokeWidth={strokeWidth + 6}
              strokeLinecap="round"
              opacity={isTraced ? 0.3 : 0.1}
            />
          );

          // Main line
          elements.push(
            <Line
              key={`seg-${i}`}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={isTraced ? 1 : 0.6}
            />
          );

          // Numbered stroke order (only when not traced)
          if (!isTraced) {
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            elements.push(
              <G key={`num-${i}`}>
                <Circle cx={mx} cy={my} r={9} fill="#050505" stroke={colorHex} strokeWidth={0.8} opacity={0.9} />
                <SvgText x={mx} y={my + 4} fontSize={10} fill={colorHex} textAnchor="middle" fontWeight="bold">
                  {String(i + 1)}
                </SvgText>
              </G>
            );
          }
        }

        return <>{elements}</>;
      }

      case 'Hexagram': {
        const { up, down } = getHexagramTriangles(cx, cy, r);
        const upPath = `M ${up[0].x} ${up[0].y} L ${up[1].x} ${up[1].y} L ${up[2].x} ${up[2].y} Z`;
        const downPath = `M ${down[0].x} ${down[0].y} L ${down[1].x} ${down[1].y} L ${down[2].x} ${down[2].y} Z`;
        return (
          <>
            <Path d={upPath} stroke={strokeColor} strokeWidth={strokeWidth + 4} fill="none" opacity={0.15} strokeLinejoin="round" />
            <Path d={downPath} stroke={strokeColor} strokeWidth={strokeWidth + 4} fill="none" opacity={0.15} strokeLinejoin="round" />
            <Path d={upPath} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" opacity={isTraced ? 1 : 0.6} strokeLinejoin="round" />
            <Path d={downPath} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" opacity={isTraced ? 1 : 0.6} strokeLinejoin="round" />
          </>
        );
      }

      case 'Cross': {
        const lines = getCrossLines(cx, cy, r);
        return (
          <>
            {lines.map((l, i) => (
              <G key={`cross-${i}`}>
                <Line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={strokeColor} strokeWidth={strokeWidth + 4} opacity={0.15} strokeLinecap="round" />
                <Line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={strokeColor} strokeWidth={strokeWidth} opacity={isTraced ? 1 : 0.6} strokeLinecap="round" />
              </G>
            ))}
          </>
        );
      }

      default: {
        return (
          <>
            <Circle cx={cx} cy={cy} r={r} stroke={strokeColor} strokeWidth={strokeWidth + 4} fill="none" opacity={0.15} />
            <Circle cx={cx} cy={cy} r={r} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" opacity={isTraced ? 1 : 0.6} />
          </>
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.padOuter, animatedContainer]}>
        {/* Background glow */}
        <Animated.View style={[styles.glowBg, { backgroundColor: colorHex + '08' }, animatedGlow]} />

        <View {...panResponder.panHandlers}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Subtle grid lines */}
            <Line x1={cx} y1={0} x2={cx} y2={size} stroke="#1A1A1A" strokeWidth={0.5} />
            <Line x1={0} y1={cy} x2={size} y2={cy} stroke="#1A1A1A" strokeWidth={0.5} />
            <Circle cx={cx} cy={cy} r={r + 10} stroke="#1A1A1A" strokeWidth={0.5} fill="none" />

            {/* The shape with breathing opacity */}
            {renderShape()}

            {/* Ghost Guide Particle (only when not traced) */}
            {!isTraced && (
              <G>
                {/* Outer glow */}
                <Circle
                  cx={ghostPos.x}
                  cy={ghostPos.y}
                  r={12}
                  fill={colorHex}
                  opacity={0.15}
                />
                {/* Middle glow */}
                <Circle
                  cx={ghostPos.x}
                  cy={ghostPos.y}
                  r={7}
                  fill="#FFD700"
                  opacity={0.4}
                />
                {/* Core bright dot */}
                <Circle
                  cx={ghostPos.x}
                  cy={ghostPos.y}
                  r={3.5}
                  fill="#FFFFFF"
                  opacity={0.95}
                />
                {/* Tiny inner core */}
                <Circle
                  cx={ghostPos.x}
                  cy={ghostPos.y}
                  r={1.5}
                  fill="#FFD700"
                  opacity={1}
                />
              </G>
            )}

            {/* Sparkler Trail (finger tracking) */}
            {trailPoints.map((pt) => {
              const opacity = Math.max(0, 1 - pt.age / 15);
              const radius = Math.max(0.5, 3 - pt.age * 0.2);
              return (
                <G key={pt.id}>
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={radius + 4}
                    fill="#FFD700"
                    opacity={opacity * 0.15}
                  />
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={radius}
                    fill="#FFFFFF"
                    opacity={opacity * 0.8}
                  />
                </G>
              );
            })}

            {/* Success: golden shape overlay */}
            {isTraced && (
              <G opacity={0.2}>
                {shape === 'Pentagram' && (() => {
                  const pts = getPentagramPoints(cx, cy, r);
                  let d = `M ${pts[PENTAGRAM_ORDER[0]].x} ${pts[PENTAGRAM_ORDER[0]].y}`;
                  for (let i = 1; i < PENTAGRAM_ORDER.length; i++) {
                    d += ` L ${pts[PENTAGRAM_ORDER[i]].x} ${pts[PENTAGRAM_ORDER[i]].y}`;
                  }
                  d += ' Z';
                  return <Path d={d} fill="#D4AF37" />;
                })()}
              </G>
            )}
          </Svg>
        </View>

        {/* Status label */}
        <View style={[styles.statusBadge, isTraced && { borderColor: '#D4AF3760', backgroundColor: '#D4AF3710' }]}>
          <Text style={[styles.statusText, isTraced && { color: '#D4AF37' }]}>
            {isTraced ? '✦ Shape Sealed' : `Trace: ${shape}`}
          </Text>
        </View>
      </Animated.View>

      {/* Small replay/simulate controls */}
      <View style={styles.controlRow}>
        {Platform.OS === ('web' as string) && !isTraced && onSimulateTrace && (
          <Pressable
            onPress={onSimulateTrace}
            style={({ pressed }) => [styles.replayBtn, pressed && { opacity: 0.5 }]}
          >
            <Text style={styles.replayBtnText}>✓ Complete</Text>
          </Pressable>
        )}
        {isTraced && onSimulateTrace && (
          <Pressable
            onPress={() => {
              // Reset would be handled by parent
            }}
            style={({ pressed }) => [styles.replayBtn, pressed && { opacity: 0.5 }]}
          >
            <Text style={styles.replayBtnText}>↻</Text>
          </Pressable>
        )}
      </View>
    </View>
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
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
    gap: 8,
  },
  replayBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  replayBtnText: {
    fontSize: 11,
    color: '#6B6B6B',
    fontFamily: 'JetBrainsMono',
  },
});
