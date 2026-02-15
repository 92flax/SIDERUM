import { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, TextInput, ScrollView, Platform, Pressable, FlatList, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useAstroStore } from '@/lib/astro/store';
import { searchLocation, reverseGeocode, GeocodingResult } from '@/lib/geocoding';

export default function SettingsScreen() {
  const location = useAstroStore((s) => s.location);
  const date = useAstroStore((s) => s.date);
  const setLocation = useAstroStore((s) => s.setLocation);
  const setDate = useAstroStore((s) => s.setDate);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [isGettingGPS, setIsGettingGPS] = useState(false);
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reverse geocode current location on mount and when location changes
  useEffect(() => {
    reverseGeocode(location.latitude, location.longitude).then(setLocationName);
  }, [location]);

  useEffect(() => {
    const d = date;
    setDateText(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`);
    setTimeText(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
  }, [date]);

  // Debounced search
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const results = await searchLocation(text);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  };

  const handleSelectLocation = (result: GeocodingResult) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setLocation({ latitude: result.latitude, longitude: result.longitude });
    setSearchQuery('');
    setSearchResults([]);
    setLocationName(result.city && result.country ? `${result.city}, ${result.country}` : result.displayName.split(',').slice(0, 2).join(','));
  };

  const handleUseGPS = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsGettingGPS(true);
    try {
      if (Platform.OS === ('web' as string)) {
        setIsGettingGPS(false);
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsGettingGPS(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      // Silently fail
    }
    setIsGettingGPS(false);
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Settings</Text>

        {/* Location Section */}
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.card}>
          {/* Current Location Display */}
          <View style={styles.currentLocation}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{locationName || 'Loading...'}</Text>
              <Text style={styles.locationCoords}>
                {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Search city or place..."
              placeholderTextColor="#4A4A4A"
              returnKeyType="search"
            />
            {isSearching && <ActivityIndicator size="small" color="#D4AF37" style={styles.searchSpinner} />}
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsList}>
              {searchResults.map((result, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSelectLocation(result)}
                  style={({ pressed }) => [styles.resultItem, pressed && { backgroundColor: '#1A1A1A' }]}
                >
                  <Text style={styles.resultName}>
                    {result.city || result.displayName.split(',')[0]}
                  </Text>
                  <Text style={styles.resultDetail} numberOfLines={1}>
                    {result.displayName}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* GPS Button */}
          <Pressable
            onPress={handleUseGPS}
            style={({ pressed }) => [styles.gpsBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
          >
            {isGettingGPS ? (
              <ActivityIndicator size="small" color="#050505" />
            ) : (
              <Text style={styles.gpsBtnText}>📡 Use Current Location</Text>
            )}
          </Pressable>
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
              placeholderTextColor="#4A4A4A"
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
              placeholderTextColor="#4A4A4A"
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
          <Text style={styles.aboutVersion}>Version 2.0.0</Text>
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
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Geocoding</Text>
            <Text style={styles.aboutValue}>OpenStreetMap / Nominatim</Text>
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
  currentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  locationIcon: {
    fontSize: 22,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  locationCoords: {
    fontFamily: 'JetBrainsMono',
    fontSize: 11,
    color: '#6B6B6B',
    marginTop: 2,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#E0E0E0',
    fontSize: 14,
  },
  searchSpinner: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  resultsList: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  resultItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  resultDetail: {
    fontSize: 11,
    color: '#6B6B6B',
    marginTop: 2,
  },
  gpsBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  gpsBtnText: {
    color: '#050505',
    fontSize: 14,
    fontWeight: '700',
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
