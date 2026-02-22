// ============================================================
// ÆONIS – Holo-Pad V3: Intent-Aware Tracing with Ghost Guide
// Correct Golden Dawn pentagram directions, Start-Anchor Halo,
// Ghost Particle, breathing path, sparkler trail
// ============================================================

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, PanResponder, GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Path, G, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {
  getPentagramOrder as getDynamicPentagramOrder,
  getHexagramTrianglePaths,
  getSelectionColor,
  isElementName,
  isPlanetName,
  type ElementName,
  type PlanetName,
} from '@/lib/ritual/geometry';

export type RitualIntent = 'BANISH' | 'INVOKE';

interface SigilLine {
  x1: number; y1: number; x2: number; y2: number; key: string;
}
interface SigilPath {
  d: string; key: string;
}

interface HoloPadProps {
  shape: string;          // e.g. "Pentagram", "Hexagram", "Cross", "Circle"
  colorHex: string;       // e.g. "#3B82F6"
  isTraced: boolean;      // Whether the user has completed tracing
  onSimulateTrace?: () => void;  // Web fallback
  intent?: RitualIntent;  // BANISH or INVOKE (affects pentagram direction)
  isLBRP?: boolean;       // Force Electric Blue for LBRP Banish
  // Dynamic Geometry Engine props
  dynamicSelection?: 'none' | 'element' | 'planet';
  dynamicChoice?: string | null;  // e.g. 'Earth', 'Fire', 'Sun', 'Mars'
  // Template parser: instruction text with {{SELECTION}} placeholder
  instructionText?: string;
  // AR Sigil Anchor: bindrune lines/paths to render pulsing in center
  sigilLines?: SigilLine[];
  sigilPaths?: SigilPath[];
  sigilWidth?: number;
  sigilHeight?: number;
}

// ---- Geometry helpers ----

// Get the 5 vertices of a pentagram (top vertex at index 0)
function getPentagramVertices(cx: number, cy: number, r: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 5; i++) {
    // Start from top (12 o'clock) and go clockwise
    const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }
  return points;
}

// Golden Dawn Standard Pentagram Drawing Orders:
// Vertices: 0=Top(Spirit), 1=Upper-Right(Water), 2=Lower-Right(Fire), 3=Lower-Left(Earth), 4=Upper-Left(Air)
//
// Banishing Earth: Start Lower-Left(3) → Top(0) → Lower-Right(2) → Upper-Left(4) → Upper-Right(1) → Lower-Left(3)
// Invoking Earth:  Start Top(0) → Lower-Left(3) → Upper-Right(1) → Upper-Left(4) → Lower-Right(2) → Top(0)

const BANISH_EARTH_ORDER = [3, 0, 2, 4, 1, 3];
const INVOKE_EARTH_ORDER = [0, 3, 1, 4, 2, 0];

function getPentagramOrderDefault(intent: RitualIntent): number[] {
  return intent === 'INVOKE' ? INVOKE_EARTH_ORDER : BANISH_EARTH_ORDER;
}

function getHexagramTriangles(cx: number, cy: number, r: number) {
  const up: Array<{ x: number; y: number }> = [];
  const down: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 3; i++) {
    const upAngle = -Math.PI / 2 + (i * 2 * Math.PI / 3);
    up.push({ x: cx + r * Math.cos(upAngle), y: cy + r * Math.sin(upAngle) });
    const downAngle = Math.PI / 2 + (i * 2 * Math.PI / 3);
    down.push({ x: cx + r * Math.cos(downAngle), y: cy + r * Math.sin(downAngle) });
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
function getShapeSegments(
  shape: string, cx: number, cy: number, r: number, intent: RitualIntent,
  dynChoice?: string | null,
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const size = (cx * 2); // Reconstruct size from cx
  switch (shape) {
    case 'Pentagram': {
      const pts = getPentagramVertices(cx, cy, r);
      // Use dynamic element order if available
      const order = (dynChoice && isElementName(dynChoice))
        ? getDynamicPentagramOrder(intent, dynChoice as ElementName)
        : getPentagramOrderDefault(intent);
      const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
      for (let i = 0; i < order.length - 1; i++) {
        const from = pts[order[i]];
        const to = pts[order[i + 1]];
        segs.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
      }
      return segs;
    }
    case 'Hexagram': {
      // Use dynamic planet hexagram if available
      if (dynChoice && isPlanetName(dynChoice)) {
        const triPaths = getHexagramTrianglePaths(intent, dynChoice as PlanetName);
        const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
        for (const tri of triPaths) {
          for (let i = 0; i < tri.length - 1; i++) {
            segs.push({
              x1: tri[i].x * size, y1: tri[i].y * size,
              x2: tri[i + 1].x * size, y2: tri[i + 1].y * size,
            });
          }
        }
        return segs;
      }
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

function totalPathLength(segments: Array<{ x1: number; y1: number; x2: number; y2: number }>): number {
  return segments.reduce((sum, s) => {
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);
}

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

  const last = segments[segments.length - 1];
  return { x: last?.x2 ?? 0, y: last?.y2 ?? 0 };
}

// ---- Trail Point ----
interface TrailPoint {
  x: number;
  y: number;
  age: number;
  id: number;
}

export function HoloPad({ shape, colorHex, isTraced, onSimulateTrace, intent = 'BANISH', isLBRP = false, dynamicSelection = 'none', dynamicChoice = null, instructionText, sigilLines, sigilPaths, sigilWidth, sigilHeight }: HoloPadProps) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  // Dynamic Geometry Engine: override color and pentagram order when active
  const isDynamic = dynamicSelection !== 'none' && !!dynamicChoice;
  const dynamicColor = isDynamic ? getSelectionColor(dynamicChoice!) : null;

  // Force Electric Blue for LBRP Banish, then dynamic override, then default
  const activeColor = (isLBRP && intent === 'BANISH') ? '#00FFFF' : (isDynamic ? dynamicColor! : colorHex);

  // Template parser: replace {{SELECTION}} in instruction text
  const parsedInstructionText = useMemo(() => {
    if (!instructionText) return undefined;
    if (!dynamicChoice) return instructionText;
    return instructionText.replace(/\{\{SELECTION\}\}/g, dynamicChoice);
  }, [instructionText, dynamicChoice]);

  // Ghost particle animation state
  const [ghostFraction, setGhostFraction] = useState(0);
  const ghostTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Trail state for finger tracking
  const [trailPoints, setTrailPoints] = useState<TrailPoint[]>([]);
  const trailIdRef = useRef(0);
  const trailTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Anchor pulse
  const anchorPulse = useSharedValue(0.4);

  // Reanimated values
  const glowOpacity = useSharedValue(0.3);
  const successScale = useSharedValue(1);
  const breathOpacity = useSharedValue(0.5);

  // Shape segments and total length (intent-aware, dynamic-aware)
  const segments = useMemo(() => getShapeSegments(shape, cx, cy, r, intent, isDynamic ? dynamicChoice : null), [shape, cx, cy, r, intent, isDynamic, dynamicChoice]);
  const pathTotal = useMemo(() => totalPathLength(segments), [segments]);

  // Ghost particle position
  const ghostPos = useMemo(() => getPointOnPath(segments, ghostFraction, pathTotal), [segments, ghostFraction, pathTotal]);

  // Start anchor position (first vertex of the drawing order)
  const startAnchor = useMemo(() => {
    if (segments.length === 0) return { x: cx, y: cy };
    return { x: segments[0].x1, y: segments[0].y1 };
  }, [segments, cx, cy]);

  // Ghost particle animation loop (~4s for full trace) - auto-play
  useEffect(() => {
    if (isTraced) {
      if (ghostTimer.current) clearInterval(ghostTimer.current);
      return;
    }

    const GHOST_DURATION = 4000;
    const TICK = 30;
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

  // Anchor pulse animation
  useEffect(() => {
    if (!isTraced) {
      anchorPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }
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
      const x = touch.locationX - 12;
      const y = touch.locationY - 12;
      if (x >= 0 && x <= size && y >= 0 && y <= size) {
        trailIdRef.current += 1;
        setTrailPoints(prev => [
          ...prev.slice(-30),
          { x, y, age: 0, id: trailIdRef.current },
        ]);
      }
    },
    onPanResponderRelease: () => {},
  }), [isTraced, size]);

  const renderShape = () => {
    const strokeColor = isTraced ? '#D4AF37' : activeColor;
    const strokeWidth = isTraced ? 3 : 2;

    switch (shape) {
      case 'Pentagram': {
        const pts = getPentagramVertices(cx, cy, r);
        // Use dynamic element-specific order when active, otherwise default Earth order
        const order = (isDynamic && isElementName(dynamicChoice!))
          ? getDynamicPentagramOrder(intent, dynamicChoice as ElementName)
          : getPentagramOrderDefault(intent);
        const elements: React.JSX.Element[] = [];

        for (let i = 0; i < order.length - 1; i++) {
          const from = pts[order[i]];
          const to = pts[order[i + 1]];

          // Glow layer
          elements.push(
            <Line
              key={`glow-${i}`}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={isTraced ? '#D4AF37' : activeColor}
              strokeWidth={strokeWidth + 6}
              strokeLinecap="square"
              opacity={isTraced ? 0.3 : 0.1}
            />
          );

          // Main line
          elements.push(
            <Line
              key={`line-${i}`}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="square"
              opacity={isTraced ? 1 : 0.6}
            />
          );

          // Numbered stroke order (only when not traced)
          if (!isTraced) {
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            elements.push(
              <G key={`num-${i}`}>
                <Circle cx={mx} cy={my} r={9} fill="#050505" stroke={activeColor} strokeWidth={0.8} opacity={0.9} />
                <SvgText x={mx} y={my + 4} fontSize={10} fill={activeColor} textAnchor="middle" fontWeight="bold">
                  {String(i + 1)}
                </SvgText>
              </G>
            );
          }
        }

        // Vertex dots with labels
        const vertexLabels = ['Spirit', 'Water', 'Fire', 'Earth', 'Air'];
        for (let i = 0; i < 5; i++) {
          const pt = pts[i];
          const isStart = i === order[0];
          elements.push(
            <G key={`vertex-${i}`}>
              <Circle
                cx={pt.x} cy={pt.y} r={isStart ? 0 : 3}
                fill={isStart ? 'transparent' : (activeColor + '60')}
              />
              {!isTraced && (
                <SvgText
                  x={pt.x}
                  y={pt.y + (i === 0 ? -10 : i <= 2 ? 18 : 18)}
                  fontSize={7}
                  fill="#6B6B6B"
                  textAnchor="middle"
                  opacity={0.6}
                >
                  {vertexLabels[i]}
                </SvgText>
              )}
            </G>
          );
        }

        return <>{elements}</>;
      }

      case 'Hexagram': {
        // Dynamic planet hexagram: use geometry engine for planet-specific triangle order
        if (isDynamic && isPlanetName(dynamicChoice!)) {
          const triPaths = getHexagramTrianglePaths(intent, dynamicChoice as PlanetName);
          // triPaths has 2 arrays of normalized (0-1) points; scale to SVG coordinates
          const svgTriPaths = triPaths.map((tri) =>
            tri.map((pt) => ({ x: pt.x * size, y: pt.y * size }))
          );
          const pathStrings = svgTriPaths.map((tri) => {
            let d = `M ${tri[0].x} ${tri[0].y}`;
            for (let i = 1; i < tri.length; i++) {
              d += ` L ${tri[i].x} ${tri[i].y}`;
            }
            d += ' Z';
            return d;
          });
          return (
            <>
              {pathStrings.map((d, i) => (
                <G key={`hex-tri-${i}`}>
                  <Path d={d} stroke={strokeColor} strokeWidth={strokeWidth + 4} fill="none" opacity={0.15} strokeLinejoin="round" />
                  <Path d={d} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" opacity={isTraced ? 1 : 0.6} strokeLinejoin="round" />
                </G>
              ))}
            </>
          );
        }
        // Default hexagram (no dynamic selection)
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
                <Line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={strokeColor} strokeWidth={strokeWidth + 4} opacity={0.15} strokeLinecap="square" />
                <Line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={strokeColor} strokeWidth={strokeWidth} opacity={isTraced ? 1 : 0.6} strokeLinecap="square" />
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
        <Animated.View style={[styles.glowBg, { backgroundColor: activeColor + '08' }, animatedGlow]} />

        <View {...panResponder.panHandlers}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Subtle grid lines */}
            <Line x1={cx} y1={0} x2={cx} y2={size} stroke="#1A1A1A" strokeWidth={0.5} />
            <Line x1={0} y1={cy} x2={size} y2={cy} stroke="#1A1A1A" strokeWidth={0.5} />
            <Circle cx={cx} cy={cy} r={r + 10} stroke="#1A1A1A" strokeWidth={0.5} fill="none" />

            {/* The shape with breathing opacity */}
            {renderShape()}

            {/* ===== Start-Anchor Halo (pulsing at first vertex) ===== */}
            {!isTraced && (
              <G>
                {/* Outer halo ring */}
                <Circle
                  cx={startAnchor.x}
                  cy={startAnchor.y}
                  r={18}
                  fill="none"
                  stroke={activeColor}
                  strokeWidth={1.5}
                  opacity={0.3}
                />
                {/* Middle halo */}
                <Circle
                  cx={startAnchor.x}
                  cy={startAnchor.y}
                  r={12}
                  fill={activeColor}
                  opacity={0.12}
                />
                {/* Inner bright anchor */}
                <Circle
                  cx={startAnchor.x}
                  cy={startAnchor.y}
                  r={6}
                  fill={activeColor}
                  opacity={0.5}
                />
                {/* Core */}
                <Circle
                  cx={startAnchor.x}
                  cy={startAnchor.y}
                  r={3}
                  fill="#FFFFFF"
                  opacity={0.9}
                />
                {/* "START" label */}
                <SvgText
                  x={startAnchor.x}
                  y={startAnchor.y + 28}
                  fontSize={8}
                  fill={activeColor}
                  textAnchor="middle"
                  fontWeight="bold"
                  letterSpacing={2}
                  opacity={0.7}
                >
                  START
                </SvgText>
              </G>
            )}

            {/* Ghost Guide Particle (auto-play, spawns from anchor) */}
            {!isTraced && (
              <G>
                {/* Outer glow */}
                <Circle cx={ghostPos.x} cy={ghostPos.y} r={12} fill={activeColor} opacity={0.15} />
                {/* Middle glow */}
                <Circle cx={ghostPos.x} cy={ghostPos.y} r={7} fill="#FFD700" opacity={0.4} />
                {/* Core bright dot */}
                <Circle cx={ghostPos.x} cy={ghostPos.y} r={3.5} fill="#FFFFFF" opacity={0.95} />
                {/* Tiny inner core */}
                <Circle cx={ghostPos.x} cy={ghostPos.y} r={1.5} fill="#FFD700" opacity={1} />
              </G>
            )}

            {/* Sparkler Trail (finger tracking) */}
            {trailPoints.map((pt) => {
              const opacity = Math.max(0, 1 - pt.age / 15);
              const radius = Math.max(0.5, 3 - pt.age * 0.2);
              return (
                <G key={pt.id}>
                  <Circle cx={pt.x} cy={pt.y} r={radius + 4} fill="#FFD700" opacity={opacity * 0.15} />
                  <Circle cx={pt.x} cy={pt.y} r={radius} fill="#FFFFFF" opacity={opacity * 0.8} />
                </G>
              );
            })}

            {/* Success: golden shape overlay */}
            {isTraced && shape === 'Pentagram' && (() => {
              const pts = getPentagramVertices(cx, cy, r);
              const order = (isDynamic && isElementName(dynamicChoice!))
                ? getDynamicPentagramOrder(intent, dynamicChoice as ElementName)
                : getPentagramOrderDefault(intent);
              let d = `M ${pts[order[0]].x} ${pts[order[0]].y}`;
              for (let i = 1; i < order.length; i++) {
                d += ` L ${pts[order[i]].x} ${pts[order[i]].y}`;
              }
              d += ' Z';
              return <Path d={d} fill="#D4AF37" opacity={0.2} />;
            })()}

            {/* ===== AR Sigil Anchor: Bindrune pulsing in center ===== */}
            {(sigilLines?.length || sigilPaths?.length) && (() => {
              // Scale the bindrune to fit inside the shape (about 40% of the shape radius)
              const sigilScale = (r * 0.7) / (sigilHeight || 300);
              const sigilOffsetX = cx - ((sigilWidth || 200) / 2) * sigilScale;
              const sigilOffsetY = cy - ((sigilHeight || 300) / 2) * sigilScale;
              const sigilColor = isTraced ? '#D4AF37' : '#FFFFFF';
              const sigilOpacity = isTraced ? 0.8 : 0.35;

              return (
                <G opacity={sigilOpacity}>
                  {/* Sigil glow layer */}
                  {sigilLines?.map((l) => (
                    <Line
                      key={`sg-${l.key}`}
                      x1={sigilOffsetX + l.x1 * sigilScale}
                      y1={sigilOffsetY + l.y1 * sigilScale}
                      x2={sigilOffsetX + l.x2 * sigilScale}
                      y2={sigilOffsetY + l.y2 * sigilScale}
                      stroke={sigilColor}
                      strokeWidth={3}
                      strokeLinecap="square"
                      opacity={0.3}
                    />
                  ))}
                  {sigilPaths?.map((p) => {
                    // Transform the path d string by scaling and offsetting
                    const transformed = p.d.replace(/(\d+\.?\d*)/g, (match, num, offset, str) => {
                      // Alternate between x and y coordinates
                      return match; // We'll use the G transform instead
                    });
                    return (
                      <Path
                        key={`sp-${p.key}`}
                        d={p.d}
                        stroke={sigilColor}
                        strokeWidth={3 / sigilScale}
                        strokeLinecap="square"
                        fill="none"
                        opacity={0.3}
                        transform={`translate(${sigilOffsetX}, ${sigilOffsetY}) scale(${sigilScale})`}
                      />
                    );
                  })}
                  {/* Sigil core layer */}
                  {sigilLines?.map((l) => (
                    <Line
                      key={`sc-${l.key}`}
                      x1={sigilOffsetX + l.x1 * sigilScale}
                      y1={sigilOffsetY + l.y1 * sigilScale}
                      x2={sigilOffsetX + l.x2 * sigilScale}
                      y2={sigilOffsetY + l.y2 * sigilScale}
                      stroke={sigilColor}
                      strokeWidth={1.5}
                      strokeLinecap="square"
                      opacity={0.7}
                    />
                  ))}
                  {sigilPaths?.map((p) => (
                    <Path
                      key={`spc-${p.key}`}
                      d={p.d}
                      stroke={sigilColor}
                      strokeWidth={1.5 / sigilScale}
                      strokeLinecap="square"
                      fill="none"
                      opacity={0.7}
                      transform={`translate(${sigilOffsetX}, ${sigilOffsetY}) scale(${sigilScale})`}
                    />
                  ))}
                  {/* Central spine */}
                  <Line
                    x1={cx}
                    y1={sigilOffsetY}
                    x2={cx}
                    y2={sigilOffsetY + (sigilHeight || 300) * sigilScale}
                    stroke={sigilColor}
                    strokeWidth={2}
                    strokeLinecap="square"
                    opacity={0.5}
                  />
                </G>
              );
            })()}
          </Svg>
        </View>

        {/* Status label */}
        <View style={[styles.statusBadge, isTraced && { borderColor: '#D4AF3760', backgroundColor: '#D4AF3710' }]}>
          <Text style={[styles.statusText, isTraced && { color: '#D4AF37' }]}>
            {isTraced ? '✦ Shape Sealed' : `${intent === 'INVOKE' ? '↓ Invoke' : '↑ Banish'}: ${isDynamic && dynamicChoice ? `${dynamicChoice} ${shape}` : shape}`}
          </Text>
        </View>
      </Animated.View>

      {/* Small controls */}
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
            onPress={() => {}}
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
