# SIDERUM – Mobile App Interface Design

## App Concept
SIDERUM is a professional-grade astrology and ritual application for classical astrologers and ceremonial magicians. The design follows the "Cyber-Grimoire" aesthetic: minimalist, OLED-optimized dark mode with thin lines, high contrast for night vision preservation.

---

## Color Palette (Cyber-Grimoire)

| Token | Hex | Usage |
|-------|-----|-------|
| Background (Void Black) | `#050505` | OLED-optimized main background |
| Surface | `#0D0D0D` | Cards, elevated surfaces |
| Foreground (Stardust Silver) | `#E0E0E0` | Primary text |
| Muted | `#6B6B6B` | Secondary text, labels |
| Primary (Gold – Day Sect) | `#D4AF37` | Accent, Day Sect indicators |
| Night Accent (Deep Blue) | `#0055A4` | Night Sect indicators |
| Border | `#1A1A1A` | Thin 1px borders, dividers |
| Success | `#22C55E` | Strong dignity, positive states |
| Warning | `#F59E0B` | Weak dignity, caution |
| Error | `#EF4444` | Retrograde, combustion, danger |

## Typography

| Role | Font | Usage |
|------|------|-------|
| Headlines | Cinzel | Mystical serif for screen titles, section headers |
| Data/Mono | JetBrains Mono | Technical data display, coordinates, degrees |
| Body | System Default | Body text, descriptions, instructions |

---

## Screen List

### 1. Home Screen (Dashboard)
- **Content**: Current planetary positions summary, current sect (Day/Night), date/time/location display
- **Layout**: Top section with current date/time/location. Below: scrollable list of planet cards showing position, sign, dignity status, retrograde indicator
- **Key Elements**: Gold/Blue sect indicator bar, Arabic Parts (Fortune, Spirit) at bottom

### 2. Chart Detail Screen
- **Content**: Full detailed view of all planetary data
- **Layout**: Expandable sections for each planet showing all dignity information (Domicile, Exaltation, Triplicity, Term, Face), conditions (Retrograde, Combustion, Cazimi, Under Beams)
- **Key Elements**: Color-coded dignity badges, condition warning icons

### 3. Compass Screen (Ritual Compass)
- **Content**: Two sub-views toggled via segmented control
- **View 1 – AR Overlay**: Camera feed with planet position overlays (azimuth/altitude), glyph symbols with dignity glow
- **View 2 – Radar**: Top-down 2D radar with user at center, radiating lines to planets with distance/direction labels
- **Layout**: Full-screen with floating controls at top, planet legend at bottom

### 4. Sanctum Screen (Ritual Engine)
- **Content**: Ritual step-by-step player
- **Layout**: Large instruction text in center, compass direction indicator at top, progress bar, step counter
- **Key Elements**: Direction arrow overlay, "Face East" lock indicator, haptic feedback on alignment, step navigation (prev/next)

### 5. Runic Forge Screen
- **Content**: Bindrune generator
- **Layout**: Top: keyword/intention input chips. Center: SVG preview of generated bindrune. Bottom: selected runes list with planetary warnings
- **Key Elements**: Central stave with branch attachments, export button, astro-filter warnings (toast)

### 6. Settings Screen
- **Content**: Location settings (manual lat/long or GPS), date/time override, about section
- **Layout**: Standard settings list with sections

---

## Key User Flows

### Flow 1: View Current Planetary Positions
1. App opens → Home Screen with current planetary data auto-calculated
2. User sees planet cards with signs, degrees, dignity status
3. User taps a planet card → Chart Detail with full dignity breakdown

### Flow 2: Use Ritual Compass
1. User navigates to Compass tab
2. AR View shows camera with planet overlays (requires sensor permissions)
3. User toggles to Radar View for 2D top-down perspective
4. Planet labels show name + dignity glow color

### Flow 3: Run a Ritual
1. User navigates to Sanctum tab
2. Selects a ritual from loaded rituals_db.json
3. Steps through ritual: reads instruction, faces required direction
4. Compass lock blocks progress until aligned (±15°)
5. Haptic success vibration on alignment
6. Completes all steps → completion screen

### Flow 4: Create a Bindrune
1. User navigates to Runic Forge tab
2. Enters intention keywords (e.g., "Wealth", "Protection")
3. Keywords map to Elder Futhark runes
4. SVG bindrune generates with central stave + branches
5. If a rune's planet is weak/retrograde, warning toast appears
6. User can export the SVG

---

## Navigation Structure

**Tab Bar (Bottom)** – 5 tabs:
1. **Home** (house icon) – Dashboard with planetary positions
2. **Chart** (star icon) – Detailed chart data
3. **Compass** (compass icon) – AR/Radar ritual compass
4. **Sanctum** (book icon) – Ritual engine player
5. **Runes** (edit icon) – Bindrune generator

---

## Design Principles
- **OLED Black**: True black (#050505) background saves battery and preserves night vision
- **Thin Lines**: 1px stroke borders, minimal visual weight
- **High Contrast**: Stardust Silver text on Void Black
- **Sect Colors**: Gold for Day, Deep Blue for Night – used consistently
- **Minimalist**: No clutter, generous spacing, focused content
- **Mobile Portrait**: All layouts optimized for one-handed 9:16 usage
