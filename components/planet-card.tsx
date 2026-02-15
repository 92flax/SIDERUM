import { Text, View, StyleSheet } from 'react-native';
import {
  PlanetPosition, EssentialDignity, PlanetCondition, Sect,
  PLANET_SYMBOLS, ZODIAC_SYMBOLS, PLANET_COLORS, Planet,
} from '@/lib/astro/types';

interface PlanetCardProps {
  position: PlanetPosition;
  dignity: EssentialDignity;
  condition: PlanetCondition;
  sect: Sect;
}

function getDignityLabel(dignity: EssentialDignity): { label: string; color: string } {
  if (dignity.domicile) return { label: 'Domicile', color: '#22C55E' };
  if (dignity.exaltation) return { label: 'Exalted', color: '#22C55E' };
  if (dignity.triplicity) return { label: 'Triplicity', color: '#4ADE80' };
  if (dignity.term) return { label: 'Term', color: '#86EFAC' };
  if (dignity.face) return { label: 'Face', color: '#BBF7D0' };
  if (dignity.detriment) return { label: 'Detriment', color: '#EF4444' };
  if (dignity.fall) return { label: 'Fall', color: '#F87171' };
  if (dignity.peregrine) return { label: 'Peregrine', color: '#6B6B6B' };
  return { label: '', color: '#6B6B6B' };
}

function getConditionBadges(condition: PlanetCondition): Array<{ label: string; color: string }> {
  const badges: Array<{ label: string; color: string }> = [];
  if (condition.isRetrograde) badges.push({ label: '℞ Rx', color: '#F59E0B' });
  if (condition.isCazimi) badges.push({ label: '☉ Cazimi', color: '#22C55E' });
  if (condition.isCombust) badges.push({ label: '🔥 Combust', color: '#EF4444' });
  if (condition.isUnderBeams) badges.push({ label: '☉ Under Beams', color: '#F59E0B' });
  return badges;
}

export function PlanetCard({ position, dignity, condition, sect }: PlanetCardProps) {
  const planetColor = PLANET_COLORS[position.planet];
  const dignityInfo = getDignityLabel(dignity);
  const conditionBadges = getConditionBadges(condition);

  const degStr = `${position.signDegree}°${position.signMinute.toString().padStart(2, '0')}'${position.signSecond.toString().padStart(2, '0')}"`;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* Planet symbol and name */}
        <View style={styles.planetInfo}>
          <Text style={[styles.planetSymbol, { color: planetColor }]}>
            {PLANET_SYMBOLS[position.planet]}
          </Text>
          <View>
            <Text style={styles.planetName}>{position.planet}</Text>
            <Text style={styles.positionText}>
              {ZODIAC_SYMBOLS[position.sign]} {position.sign} {degStr}
            </Text>
          </View>
        </View>

        {/* Dignity badge */}
        <View style={styles.rightCol}>
          {dignityInfo.label ? (
            <View style={[styles.dignityBadge, { borderColor: dignityInfo.color + '60' }]}>
              <Text style={[styles.dignityText, { color: dignityInfo.color }]}>
                {dignityInfo.label}
              </Text>
            </View>
          ) : null}
          <Text style={styles.scoreText}>
            {dignity.score > 0 ? '+' : ''}{dignity.score}
          </Text>
        </View>
      </View>

      {/* Condition badges */}
      {conditionBadges.length > 0 && (
        <View style={styles.conditionRow}>
          {conditionBadges.map((badge, i) => (
            <View key={i} style={[styles.conditionBadge, { backgroundColor: badge.color + '15' }]}>
              <Text style={[styles.conditionText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Speed indicator */}
      <View style={styles.speedRow}>
        <Text style={styles.speedLabel}>Speed</Text>
        <Text style={[styles.speedValue, position.speed < 0 && { color: '#F59E0B' }]}>
          {position.speed >= 0 ? '+' : ''}{position.speed.toFixed(4)}°/day
        </Text>
        {position.azimuth !== undefined && (
          <>
            <Text style={styles.speedLabel}>  Az</Text>
            <Text style={styles.speedValue}>{position.azimuth.toFixed(1)}°</Text>
            <Text style={styles.speedLabel}>  Alt</Text>
            <Text style={styles.speedValue}>{position.altitude?.toFixed(1)}°</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planetSymbol: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  planetName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  positionText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    color: '#6B6B6B',
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dignityBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dignityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoreText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#6B6B6B',
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  conditionBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  conditionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  speedLabel: {
    fontSize: 10,
    color: '#6B6B6B',
  },
  speedValue: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: '#E0E0E0',
  },
});
