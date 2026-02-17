# ÆONIS Project TODO

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

## Beta Update

### Module 1: Runic Forge – Absolute Stacking
- [x] Abandon path merging, implement absolute stacking SVG strategy
- [x] Layer 0: Central vertical Stave (Spine)
- [x] Layer 1-N: Full SVG of each rune stacked on spine
- [x] Stemmed runes: align vertical stem with central spine
- [x] Stemless runes (Gebo, Ingwaz, Jera, Othala): center geometrically on spine
- [x] Verify Gebo X overlays correctly on vertical stave

### Module 2: Ritual UI – Holo-Pad
- [x] Split-screen layout: Top 40% instruction card, Bottom 60% Holo-Pad
- [x] Render target shape (Pentagram etc.) as faint glowing dashed line
- [x] Animated light particle / numbered arrows showing stroke order
- [x] Success state: shape turns solid gold and pulses
- [x] Eliminate Next button between reading and drawing steps

### Module 4: Monetization – ÆONIS PRO
- [x] Create subscription store (Pro tier state management)
- [x] Neophyte (Free): Basic Dashboard, Standard Chart, Basic Rituals (LBRP)
- [x] Adeptus (Pro): Event Horizon, Advanced Rituals, Unlimited Bindrunes, Aspectarian
- [x] Gold Padlock icon on Pro features
- [x] Upgrade modal with benefits list
- [x] Feature gating throughout the app

### Module 3: Astro-Intelligence
- [x] Event Horizon: Calculate upcoming eclipses, retrogrades, conjunctions (2 years)
- [x] Event search UI: "Find next Solar Eclipse"
- [x] Dashboard widget: Next major event warning
- [x] Aspectarian: Collapsible table of current planetary aspects
- [x] Aspect filters: Major aspects only (Conjunction, Opposition, Square, Trine) with orb < 3°
- [x] Exact aspect highlighting on Dashboard (< 1° orb)
- [x] Ruler of the Day recommendation with ritual suggestion

## UI/FX Visual Update

### Module 3: Compass Debug (Black Screen Fix)
- [x] Force mock data when sensors unavailable (hardcoded planet positions)
- [x] Wrap planet rendering in try/catch, NaN → center fallback
- [x] Fix zIndex: planets=10, background rings=1
- [x] Ensure compass renders on simulator/web without sensors

### Module 2: Rune Aesthetics (Neon & Stone)
- [x] Increase SVG strokeWidth from ~1px to 4-6px
- [x] Add neon glow drop shadow (Gold #FFD700 or Cyan #00FFFF, radius 15)
- [x] Use strokeLinecap="round" and strokeLinejoin="round"
- [x] Fix Gebo X center alignment (pixel-perfect cx, cy)

### Module 1: Ritual Animation (Ghost Guide)
- [x] Animate glowing ghost particle along pentagram SVG path (~4s loop)
- [x] Change dashed line to pulsing opacity breathing effect
- [x] Add trailing sparkler particle effect following finger drag

## Golden Master Polish

### 1. Rune Visual Refinement
- [x] Change strokeLinecap from "round" to "square"
- [x] Reduce glow blur radius for sharper definition

### 2. Ritual Interaction Update
- [x] Auto-play Ghost Particle on loop when screen loads
- [x] Remove large "Simulate Trace" button, replace with small Replay icon
- [x] Ensure touch events enabled on Holo-Pad for drawing

### 3. Settings & Legal
- [x] Add Privacy Policy link in Settings
- [x] Add Terms of Service link in Settings

### 4. Monetization Tweak
- [x] Add Yearly Access option ($39.99 Best Value) to Paywall

### 5. Haptics
- [x] Heavy impact haptic on completing a Rune drawing
- [x] Success haptic on finishing a Ritual step

## Final Polish (AR Depth, Ritual Intent & Pedagogy)

### Module 1: Ritual Intent & Direction Logic
- [x] Add BANISH/INVOKE intent toggle on Ritual Start screen (default BANISH)
- [x] Correct Pentagram directions (Banishing: Lower-Left→Top, Invoking: Top→Lower-Left)
- [x] Render pulsing Start-Anchor Halo at initial vertex
- [x] Ghost Particle spawns from anchor point
- [x] Force Electric Blue (#00FFFF) for LBRP Banish steps

### Module 2: AR Depth & Sensor Fusion
- [x] Integrate DeviceMotion for vertical pitch tracking
- [x] 3D Projection: Y-position of planets corresponds to Altitude (-90° to +90°)
- [x] Planets above horizon appear when tilting phone up, below when tilting down

### Module 3: Astro-Pedagogy
- [x] Make Aspectarian rows tappable with explanation modal/tooltip
- [x] Add written names next to symbols in Compass/Radar (e.g., "☉ Sun")
- [x] Planet Info modal with Element and Principle for 7 classical planets

### Module 5: Onboarding
- [x] 3-Slide Onboarding: "Celestial Intelligence"
- [x] 3-Slide Onboarding: "Ritual Compass" (sensor-fused navigation)
- [x] 3-Slide Onboarding: "Runic Forge" (bindrune generator)

## Project ÆONIS – Rebranding & Architecture

### 1. Global Rebranding
- [x] Replace all "Siderum" / "SIDERUM" with "ÆONIS" across all files
- [x] Update app.config.ts appName to "ÆONIS"
- [x] Update Paywall tier name to "ÆONIS Adeptus"
- [x] Update Onboarding slides: Welcome to ÆONIS, AR Calibration, Set Intent

### 2. Ritual Engine V3
- [x] AR Sigil Anchor: Project selected Bindrune SVG pulsing in center of traced pentagram shape

### 3. Runic Resonance & Library
- [x] Talisman Wallet: Link Bindrunes to planetary dignity scores, Golden Aura glow for high scores (+5)
- [x] Ritual Catalog filters: Intention (Protection, Wealth, Healing, Wisdom, Power, Purification) and Tradition (Golden Dawn, Thelema, Norse, Hermetic)
- [x] Added 4 new rituals: Middle Pillar, SIRP, Star Ruby, Hammer Rite

## Adept's Seal, Rune Wallet & Real-Time Engine

### Task 1: Adept's Seal Onboarding
- [x] Intention Input screen on first launch (Protection, Wealth, Wisdom, Power, Healing)
- [x] Procedural Master Rune generation based on intention (unique SVG)
- [x] "Infuse" tap-and-hold animation with progress ring and haptic feedback
- [x] Auto-save Master Rune to Rune Wallet as default active talisman
- [x] Replace current onboarding with Adept's Seal flow

### Task 2: Rune Wallet (Inventory)
- [x] RuneWalletView with grid layout showing all saved bindrunes
- [x] Single-selection toggle: selected rune = global Active Talisman
- [x] AsyncStorage persistence for wallet and active selection
- [x] Zustand store for global wallet state accessible from all screens

### Task 3: Ritual Mode (Dynamic UI)
- [x] Pentagram positioned in bottom-third with high-fidelity glow
- [x] IF Active Rune exists: render glowing in pentagram center
- [x] IF No Rune: render empty center with subtle placeholder

### Task 4: Real-Time Event Engine
- [x] Live ephemeris calculations: Moon Phase %, Planetary Hour, Sun/Moon Sign
- [x] Dynamic event list auto-refreshing based on current time and location
- [x] Highlight/pin current planetary hour ritual (e.g., Mars Hour → Mars Ritual)
- [x] Deep Dive Overlay: Current Influence, Recommended Color, Countdown timer
- [x] GPS integration for location-aware calculations

## Fix & Feature Update

### PART 1: Critical Bug Fixes
- [x] Compass: Fix inverted azimuth (180-degree error)
- [x] Compass: Fix AR horizon pitch/roll mapping (horizon at eye level)
- [x] Home: DELETE QuickActionsContainer entirely
- [x] Home: Restore PlanetaryChart tile alongside Wallet (2x2 grid or horizontal scroll)
- [x] Sanctum: Fix Intentions/Traditions text visibility (white-on-white contrast issue)

### PART 2: Extended Onboarding
- [x] Change Intention Input from single-select to multi-select (checkboxes/tags)
- [x] Add visible "Skip Rune Creation" button in header
- [x] Add Birth Data Input step (Date of Birth, Time of Birth, Place of Birth)
- [x] Store UserNatalData in AsyncStorage

### PART 3: Magical Power Rating
- [x] Calculate transit-based score using UserNatalData (0-100%)
- [x] Add Active Rune power modifier to score
- [x] Display "Astral Potency" gauge on Home Screen

### PART 4: Interactivity Updates
- [x] Chart: Make every planet name/icon clickable with detail modal (already implemented)
- [x] Dashboard: Add onClick tooltips for Path of Fortune, Path of Spirit, Aspects
- [x] Non-blocking navigation: Never disable Next buttons, show warning toast instead

## Digital Grimoire Refactoring

### Phase 1: Database & Schema Updates
- [x] Modify users table: add magic_name, level_rank, xp_total, stasis_streak, natal_data, active_rune_id
- [x] Create leaderboard_cache table (rank, magic_name, xp_total, level_rank)
- [x] Create user_analytics table (element XP, stasis minutes, rituals count, activity heatmap)

### Phase 2: Content Architecture (CMS Mocking)
- [x] Move rituals_db.json data to lib/content/local-fallback.ts
- [x] Create ContentProvider class in lib/content/client.ts with async getRituals()
- [x] Create ritual completion handler (lib/ritual/completion-handler.ts) with XP/element tracking
- [x] Update Sanctum to use ContentProvider instead of direct JSON imports

### Phase 3: Onboarding & Rune Logic
- [x] Refactor onboarding wizard: Step 1 Identity (magic_name + birth data)
- [x] Onboarding Step 2: Multi-select intentions
- [x] Onboarding Step 3: Procedural Master Rune forge
- [x] Onboarding Step 4: Tap & Hold activation, save to DB
- [x] Rune Wallet: grid display with single-selection toggle for active_rune_id

### Phase 4: UI Refactoring & Sensor Fixes
- [x] Compass stabilization: Low-Pass Filter (smoothed = prev*0.95 + curr*0.05)
- [x] Dashboard Header: magic_name | XP Progress Bar | Power Rating %
- [x] Sanctum Hub: Tile layout [Meditation/Stasis] [Rituals] [Library] [Events]
- [x] Radar Screen: Merge compass.tsx + chart.tsx into radar.tsx with glassmorphism bottom sheet
- [x] Delete chart.tsx tab, move PlanetCard logic to Radar bottom sheet
- [x] Create Leaderboard/Path screen (app/(tabs)/path.tsx) with Outer/Inner Order tabs

### Phase 5: Adept Analytics
- [x] Create adept.tsx screen with Grimoire Analytics
- [x] Elemental Radar: 5-axis radar chart (Earth, Air, Fire, Water, Spirit)
- [x] Consistency Heatmap: 3-month activity grid (Gray→Blue→Gold)
- [x] Planetary Affinity: Donut chart of top 3 invoked planetary forces

### Phase 6: Logic & Algorithms
- [x] Stasis Mode: 4-4-4-4 breathing timer with session tracking
- [x] Power Rating update: 40% Transits + 40% Natal + 20% Active Rune
- [x] Stasis Buff: x1.15 multiplier if session > 5min within last 60min

### UI Polish
- [x] Install and use lucide-react-native for tab bar icons
- [x] Tab icons: Home→Home, Sanctum→Flame, Radar→Compass, Path→Trophy, Adept→User
- [x] Compass smoothing factor tied to frame rate

## Radar Redesign – Magical AR Astrolabe

### Compass Logic Fix
- [x] Fix 180° inversion in calculateHeading: return (degrees + 180) % 360
- [x] Ensure Low-Pass Filter active: smoothed = prev*0.95 + curr*0.05

### Radar UI Redesign
- [x] AR Viewfinder: Full-screen camera feed with gold reticle crosshair overlay
- [x] Reticle glow feedback: Cyan glow when aligned with cardinal direction or planet
- [x] Rotating Compass Ring (Runic/Zodiac SVG wheel) at bottom-center
- [x] Ring rotates based on heading so North matches True North
- [x] Top Bar: Glassmorphism panel with Azimuth + Planetary Hour
- [x] Bottom Sheet: Swipe-up glass panel with merged planetary list from chart.tsx
- [x] Planet rows: Icon, Name, Degree, Zodiac Sign
- [x] Glassmorphism style: blur 20, opacity 0.8 dark, 1px gold border
