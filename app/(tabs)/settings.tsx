import { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TextInput, ScrollView, Platform, Pressable } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useAstroStore } from '@/lib/astro/store';

export default function SettingsScreen() {
  const location = useAstroStore((s) => s.location);
  const date = useAstroStore((s) => s.date);
  const setLocation = useAstroStore((s) => s.setLocation);
  const setDate = useAstroStore((s) => s.setDate);

  const [latText, setLatText] = useState(location.latitude.toString());
  const [lonText, setLonText] = useState(location.longitude.toString());
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');

  useEffect(() => {
    setLatText(location.latitude.toFixed(4));
    setLonText(location.longitude.toFixed(4));
  }, [location]);

  useEffect(() => {
    const d = date;
    setDateText(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`);
    setTimeText(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
  }, [date]);

  const handleUseGPS = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      if (Platform.OS === 'web') return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) {
      // Silently fail
    }
  };

  const handleApplyLocation = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const lat = parseFloat(latText);
    const lon = parseFloat(lonText);
    if (!isNaN(lat) && !isNaN(lon)) {
      setLocation({ latitude: lat, longitude: lon });
    }
  };

  const handleApplyDateTime = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const parts = dateText.split('-');
    const timeParts = timeText.split(':');
    if (parts.length === 3 && timeParts.length === 2) {
      const newDate = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
        parseInt(timeParts[0]),
        parseInt(timeParts[1]),
      );
      if (!isNaN(newDate.getTime())) {
        setDate(newDate);
      }
    }
  };

  const handleUseNow = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDate(new Date());
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Location Section */}
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              style={styles.input}
              value={latText}
              onChangeText={setLatText}
              keyboardType="numeric"
              placeholderTextColor="#6B6B6B"
              returnKeyType="done"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              style={styles.input}
              value={lonText}
              onChangeText={setLonText}
              keyboardType="numeric"
              placeholderTextColor="#6B6B6B"
              returnKeyType="done"
            />
          </View>
          <View style={styles.btnRow}>
            <Pressable
              onPress={handleApplyLocation}
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.btnText}>Apply</Text>
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable
                onPress={handleUseGPS}
                style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.btnSecondaryText}>Use GPS</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Date/Time Section */}
        <Text style={styles.sectionTitle}>Date & Time</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={dateText}
              onChangeText={setDateText}
              placeholder="2025-03-21"
              placeholderTextColor="#6B6B6B"
              returnKeyType="done"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={timeText}
              onChangeText={setTimeText}
              placeholder="12:00"
              placeholderTextColor="#6B6B6B"
              returnKeyType="done"
            />
          </View>
          <View style={styles.btnRow}>
            <Pressable
              onPress={handleApplyDateTime}
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.btnText}>Apply</Text>
            </Pressable>
            <Pressable
              onPress={handleUseNow}
              style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.btnSecondaryText}>Use Now</Text>
            </Pressable>
          </View>
        </View>

        {/* About Section */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <Text style={styles.aboutTitle}>SIDERUM</Text>
          <Text style={styles.aboutText}>
            Professional-grade application for classical astrologers and ceremonial magicians.
          </Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Calculations</Text>
            <Text style={styles.aboutValue}>astronomy-engine</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Dignity System</Text>
            <Text style={styles.aboutValue}>Ptolemaic (Egyptian Terms)</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Triplicity</Text>
            <Text style={styles.aboutValue}>Dorothean</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    color: '#D4AF37',
    textAlign: 'center',
    letterSpacing: 3,
  },
  sectionTitle: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#6B6B6B',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#E0E0E0',
    fontFamily: 'JetBrainsMono',
    fontSize: 14,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  btn: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  btnText: {
    color: '#050505',
    fontSize: 13,
    fontWeight: '700',
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  btnSecondaryText: {
    color: '#E0E0E0',
    fontSize: 13,
  },
  aboutTitle: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    color: '#D4AF37',
    letterSpacing: 4,
  },
  aboutText: {
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 8,
    lineHeight: 20,
  },
  aboutVersion: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#6B6B6B',
    marginTop: 4,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  aboutLabel: {
    fontSize: 12,
    color: '#6B6B6B',
  },
  aboutValue: {
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    color: '#E0E0E0',
  },
});
