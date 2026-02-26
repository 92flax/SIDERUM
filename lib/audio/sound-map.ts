// ============================================================
// ÆONIS – Frequency Sound Map
// Maps frequency Hz values to CDN-hosted WAV assets
// ============================================================

/**
 * CDN-hosted WAV assets for Gnosis Terminal frequency playback.
 * Keys are the Hz value as a string (matching the original filename without extension).
 * Values are CDN URLs for streaming via expo-audio createAudioPlayer.
 */
export const FrequencySounds: Record<string, string> = {
  '126.22': 'https://d2xsxph8kpxj0f.cloudfront.net/106428115/5BDNm5u3KqV79wrKBjhrYw/126.22_58039e48.wav',
  '144.72': 'https://d2xsxph8kpxj0f.cloudfront.net/106428115/5BDNm5u3KqV79wrKBjhrYw/144.72_559bdeb9.wav',
  '147.27': 'https://d2xsxph8kpxj0f.cloudfront.net/106428115/5BDNm5u3KqV79wrKBjhrYw/147.27_08e46124.wav',
  '148.85': 'https://d2xsxph8kpxj0f.cloudfront.net/106428115/5BDNm5u3KqV79wrKBjhrYw/148.85_385b2062.wav',
  '174': 'https://d2xsxph8kpxj0f.cloudfront.net/106428115/5BDNm5u3KqV79wrKBjhrYw/174_00abf001.wav',
  '183.58': 'https://d2xsxph8kpxj0f.cloudfront.net/106428115/5BDNm5u3KqV79wrKBjhrYw/183.58_bf3c5541.wav',
  '210.42': 'https://d2xsxph8kpxj0f.cloudfront.net/106428115/5BDNm5u3KqV79wrKBjhrYw/210.42_ab64fe95.wav',
  '221.23': 'https://d2xsxph8kpxj0f.cloudfront.net/106428115/5BDNm5u3KqV79wrKBjhrYw/221.23_0939af1c.wav',
  '432': 'https://d2xsxph8kpxj0f.cloudfront.net/106428115/5BDNm5u3KqV79wrKBjhrYw/432_6ac48c5c.wav',
};

/**
 * Get the audio source for a given frequency Hz string.
 * Returns a { uri: string } object for expo-audio createAudioPlayer, or null if not found.
 */
export function getFrequencySource(hz: string): { uri: string } | null {
  const url = FrequencySounds[hz];
  return url ? { uri: url } : null;
}

/**
 * All available frequency Hz values (sorted ascending).
 */
export const AVAILABLE_FREQUENCIES = Object.keys(FrequencySounds)
  .map(Number)
  .sort((a, b) => a - b)
  .map(String);
