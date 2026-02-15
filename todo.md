# SIDERUM Project TODO

## Setup & Branding
- [x] Configure Cyber-Grimoire theme (colors, typography)
- [x] Generate app logo
- [x] Update app.config.ts with branding
- [x] Set up tab navigation (5 tabs)
- [x] Add icon mappings for all tabs

## Module 1: Astrological Core
- [x] Implement calculation engine (astronomy-engine)
- [x] Calculate planetary positions (Sun, Moon, Mercury-Pluto, Nodes, Lilith)
- [x] Implement Essential Dignities (Domicile, Exaltation, Triplicity, Term, Face, Detriment, Fall)
- [x] Implement Sect determination (Day vs Night)
- [x] Implement Conditions (Retrograde, Combustion, Cazimi, Under Beams)
- [x] Calculate Arabic Parts (Fortune, Spirit)
- [x] Create Home Screen with planetary dashboard
- [x] Create Chart Detail Screen with full dignity breakdown

## Module 2: Ritual Compass
- [x] Implement sensor fusion (Magnetometer, GPS, Gyroscope)
- [x] Convert Ecliptic to Horizontal coordinates (Azimuth/Altitude)
- [x] Create AR Overlay view with planet positions on camera
- [x] Create Radar View (2D top-down)
- [x] Planet labels with dignity status glow

## Module 4: Ritual Engine (Sanctum)
- [x] Define RitualStep TypeScript interface
- [x] Create rituals_db.json sample data
- [x] Build step-by-step ritual player UI
- [x] Implement compass direction lock (±15° tolerance)
- [x] Haptic feedback on alignment
- [x] Motion detection for TRACE actions
- [x] Step navigation (prev/next/progress)

## Module 3: Runic Forge
- [x] Create Elder Futhark rune dictionary with keyword mappings
- [x] Implement SVG bindrune generation algorithm (central stave + branches)
- [x] Create keyword input UI with chips
- [x] Implement Astro-Filter (planetary weakness warnings)
- [x] SVG export functionality

## UI/UX Polish
- [x] Cinzel font for headlines
- [x] JetBrains Mono for data display
- [x] Settings screen (location, date/time)
- [x] Consistent Cyber-Grimoire styling across all screens

## Testing
- [x] Astrological Core engine tests (15 tests passing)
- [x] Compass sensor fusion tests (10 tests passing)
- [x] Rune dictionary and bindrune generator tests (8 tests passing)

## V2 Master Update
- [x] Homescreen: Replace planet list with Magical Dashboard
- [x] Homescreen: Planetary Hour hero card with Lord of the Hour
- [x] Homescreen: Moon Phase visual widget
- [x] Homescreen: Sky Verdict (Strongest Influence + Current Challenge)
- [x] Homescreen: Quick Actions 2x2 grid (Ritual, Compass, Runes, Full Chart)
- [x] Binderune Fix: Classify stemless runes (Gebo, Ingwaz, Jera, Dagaz)
- [x] Binderune Fix: Overlay entire SVG path for stemless runes on stave
- [x] Binderune Fix: Verify Fehu + Gebo + Uruz renders correctly
- [x] Settings: Replace Lat/Long with Location Search Bar (Geocoding)
- [x] Settings: Add GPS "Current Location" button
- [x] Settings: Reverse geocoding to display City, Country
- [x] Compass: Anti-collision offset for overlapping planet labels
- [x] Compass: Altitude ring labels (Horizon 0°, 30°, 60°, Zenith 90°)
- [x] Compass: Focus Mode - tap planet to highlight, dim others to 30%
- [x] Chart Detail: Dynamic tags - only show active dignities
- [x] Chart Detail: Verdict text based on score
- [x] Chart Detail: Bug fix - Combust tag never appears for Sun
