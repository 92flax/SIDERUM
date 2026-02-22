// ============================================================
// ÆONIS – Ritual Engine Types (from spec)
// ============================================================

export interface RitualStep {
  order: number;
  action_type: 'MOVEMENT' | 'VIBRATION' | 'VISUALIZATION' | 'GESTURE' | 'TRACE';
  instruction_text: string;
  compass_direction?: 'EAST' | 'SOUTH' | 'WEST' | 'NORTH' | 'ZENITH' | 'NADIR';
  ar_element?: {
    shape: string;
    color_hex: string;
    position: string;
  };
  audio_vibration?: {
    word: string;
    phonetic: string;
    file_ref?: string;
  };
}

export type RitualIntention = 'Protection' | 'Wealth' | 'Healing' | 'Wisdom' | 'Power' | 'Purification' | 'General';
export type RitualTradition = 'Golden Dawn' | 'Thelema' | 'Norse' | 'Hermetic' | 'General';

export interface Ritual {
  id: string;
  name: string;
  description: string;
  tradition: string;
  intention?: RitualIntention;
  traditionTag?: RitualTradition;
  supportsIntent?: boolean;
  dynamicSelection?: 'none' | 'element' | 'planet';
  steps: RitualStep[];
}

export type RitualPlayerState = 'idle' | 'running' | 'paused' | 'compass_lock' | 'tracing' | 'completed';
