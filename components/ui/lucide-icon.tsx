// ============================================================
// ÆONIS – Lucide Icon Wrapper for Tab Bar
// Uses lucide-react-native for crisp, consistent icons
// ============================================================

import { Home, Flame, Compass, Trophy, User, Settings, Wallet, PenTool } from 'lucide-react-native';
import { type ComponentProps } from 'react';
import { OpaqueColorValue } from 'react-native';

const ICON_MAP = {
  home: Home,
  flame: Flame,
  compass: Compass,
  trophy: Trophy,
  user: User,
  settings: Settings,
  wallet: Wallet,
  'pen-tool': PenTool,
} as const;

export type LucideIconName = keyof typeof ICON_MAP;

export function LucideIcon({
  name,
  size = 24,
  color,
  strokeWidth = 2,
}: {
  name: LucideIconName;
  size?: number;
  color: string | OpaqueColorValue;
  strokeWidth?: number;
}) {
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) return null;
  return <IconComponent size={size} color={color as string} strokeWidth={strokeWidth} />;
}
