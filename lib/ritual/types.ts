// ============================================================
// SIDERUM – Ritual Engine Types (from spec)
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

export interface Ritual {
  id: string;
  name: string;
  description: string;
  tradition: string;
  steps: RitualStep[];
}

export type RitualPlayerState = 'idle' | 'running' | 'paused' | 'compass_lock' | 'tracing' | 'completed';
