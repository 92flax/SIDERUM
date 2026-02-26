// ============================================================
// ÆONIS – Frequency Sound Map
// Maps frequency IDs and Hz values to local WAV assets
// ============================================================

/**
 * Local WAV assets for Gnosis Terminal frequency playback.
 * Keys are the Hz value as a string (matching the filename without extension).
 * Values are require() calls so Metro bundles them correctly.
 */
export const FrequencySounds: Record<string, any> = {
  '126.22': require('../../assets/audio/126.22.wav'),
  '144.72': require('../../assets/audio/144.72.wav'),
  '147.27': require('../../assets/audio/147.27.wav'),
  '148.85': require('../../assets/audio/148.85.wav'),
  '174': require('../../assets/audio/174.wav'),
  '183.58': require('../../assets/audio/183.58.wav'),
  '210.42': require('../../assets/audio/210.42.wav'),
  '221.23': require('../../assets/audio/221.23.wav'),
  '432': require('../../assets/audio/432.wav'),
};

/**
 * Get the local audio source for a given frequency Hz string.
 * Returns the require() asset or null if not found.
 */
export function getFrequencySource(hz: string): any | null {
  return FrequencySounds[hz] ?? null;
}

/**
 * All available frequency Hz values (sorted ascending).
 */
export const AVAILABLE_FREQUENCIES = Object.keys(FrequencySounds)
  .map(Number)
  .sort((a, b) => a - b)
  .map(String);
