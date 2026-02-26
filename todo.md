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

## Radar Fixes & Legend

### Compass Direction Fix
- [x] Fix compass still showing inverted direction (East shows West) – remove the +180° offset
- [x] Remove reticle/crosshair overlay from compass ring

### Planet Legend & Focus Mode
- [x] Add planet legend below compass with all planet names and colored dots
- [x] Click on legend planet = only that planet visible on radar, others disappear
- [x] Click again to deselect and show all planets

## Compass Fix v3

- [x] Fix East/West mirror: compass shows East when pointing West and vice versa – negate magX in atan2
- [x] Reduce smoothing factor from 0.95→0.20 to make compass more responsive (less laggy)

## Ascension Hub & Gamification

### Ascension Hub (adept.tsx)
- [x] Section 1 – The Mirror: Avatar, Magic Name, Level Circle header
- [x] Soul Radar: Pentagonal radar chart (Fire, Water, Air, Earth, Spirit)
- [x] Consistency: 30-day heatmap grid (GitHub style)
- [x] Section 2 – The Veil: Locked feature teaser card with blurred icon + lock overlay
- [x] Section 3 – The Firmament: Vertical ladder with Secret Chiefs (top 3) and Rivalry Slice
- [x] Firmament animation: User card slides into rank position on load

### Stasis Timer (components/stasis/timer.tsx)
- [x] Circular Phase Ring: Silver (0-5m), Blue (5-15m, buff active), Gold (15m+, XP boost)
- [x] On exit: call trpc.user.refreshLeaderboard() immediately

### Onboarding Wizard (components/onboarding/wizard.tsx)
- [x] Step 1: magic_name + birth date input
- [x] Step 2: Forging signature rune
- [x] Step 3: Save and complete

## Navigation Cleanup & Sanity CMS

### Module 1: Navigation Cleanup
- [x] Remove "The Path" tab/screen from bottom navigation
- [x] Delete app/(tabs)/path.tsx file
- [x] Clean up any references to path.tsx in _layout.tsx and other files
- [x] Mandatory onboarding: check hasCompletedOnboarding via AsyncStorage on app launch
- [x] If not completed, route to onboarding screens before showing main app
- [x] Store hasCompletedOnboarding flag after onboarding completion

### Module 2: Sanity CMS Integration
- [x] Install @sanity/client package
- [x] Create lib/cms/sanity.ts with client config (projectId: cq6s3aun, dataset: production)
- [x] Write getLevels() GROQ query with TypeScript types
- [x] Write getRituals() GROQ query with TypeScript types
- [x] Write getScriptures() GROQ query with TypeScript types
- [x] Write getEvents() GROQ query with TypeScript types

## Onboarding Routing Fix

- [x] Create app/onboarding.tsx as proper Expo Router route (no tab bar)
- [x] Refactor app/_layout.tsx: check hasCompletedOnboarding, use router.replace('/onboarding') if false
- [x] On onboarding completion: set flag to true, router.replace('/(tabs)')
- [x] Ensure tab bar is hidden during onboarding screen
- [x] Remove inline AdeptsSeal rendering from _layout.tsx

## Sanctum Library – Sanity CMS Integration

- [x] Install react-native-markdown-display package
- [x] Fetch scriptures from Sanity CMS via getScriptures() in sanctum.tsx
- [x] Group scriptures by level_required in Library section
- [x] Feature gating: lock icon + greyscale for scriptures above user level
- [x] Show "Requires Level X" message on locked scripture tap
- [x] Full-screen modal reader for unlocked scriptures with Markdown rendering
- [x] Style Markdown reader with Cinzel/JetBrainsMono fonts and dark esoteric theme
- [x] Integrate Library section under "Library" header in Sanctum screen

## Astral Potency Engine

### Engine Logic (lib/astro/potency-engine.ts)
- [x] Adept Potency Score: (1 + Level/10) * (stasis_active ? 1.5 : 1.0)
- [x] Rune Synergy: HIGH (1.5x) if rune.planet == currentHour.planet, MED (1.2x) if element match, LOW (1.0x)
- [x] Collective Boost: globalEvent.active → xpMultiplier
- [x] Actionable Recommendations: text mapper per planetary hour (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn)
- [x] Text Synthesis Templates: PRIO 1 (Global Event), PRIO 2 (High Synergy), PRIO 3 (Standard)
- [x] UserStatusText: stasis_active → "Your mind is focused" / "A stasis session would optimize your potential"

### UI (Home Screen AstralPotencyCard)
- [x] Delete old astral potency widget from index.tsx
- [x] Create AstralPotencyCard with PLANET_COLORS background glow (0.2 opacity animated)
- [x] Display synthesized Headline and Message from engine
- [x] Quick Action button linking to recommended ritual

## Advanced Stasis & Ritual Intent

### Task 1: Advanced Fluid Stasis
- [x] Add breathingRhythm GROQ query to Sanity CMS client (id, name, inhale, holdIn, exhale, holdOut, colorHex)
- [x] Breathing rhythm picker UI on Stasis screen
- [x] Ritual Priming: selector to attune Stasis glow to a ritual's planetary/elemental color
- [x] Fluid reanimated animations: smooth circle expand/contract synced to breath phases (no setInterval)
- [x] Nebula Glow: radial gradient behind circle, intensifies on inhale, dims on exhale
- [x] Smooth circle fill animation (not ticking)
- [x] Phase text fade in/out in center (Inhale/Hold/Exhale/Void) with Cinzel font
- [x] Haptics: Light impact on every breath phase transition
- [x] Stasis Accumulator Buff: track daily completion, show glowing SVG aura on Home if active

### Task 2: Conditional Ritual Intent
- [x] Add supportsIntent boolean to Sanity ritual GROQ query
- [x] Conditionally render BANISH/INVOKE toggle only if currentRitual.supportsIntent === true
- [x] Hide intent section entirely if supportsIntent is false, proceed automatically

## Stasis Circle Restoration & Upgrade

- [x] Restore central breathing circle (250px ring, borderWidth 2, no solid background)
- [x] Fluid scale animation: Inhale → scale 1.3, Exhale → scale 0.8 with Easing.inOut
- [x] Phase text (Inhale/Hold/Exhale/Void) centered inside ring, Cinzel font, white/gold
- [x] Nebula Glow: Animated.View behind circle, radial gradient matching rhythm color, opacity synced to breath
- [x] Deep black background (#050505 or #0D0D0D)
- [x] Minimal thin-bordered controls for rhythm selector (no clunky buttons)
- [x] Premium dark esoteric ÆONIS aesthetic throughout

## Stasis UI Critical Fix (Senior UI/UX Review)

### 1. Rhythm Selector – Elegant & Dark
- [x] Horizontally scrollable Rhythm Cards/Pills with esoteric styling
- [x] Unselected: bg #0D0D0D, border #333333, text #6B6B6B (JetBrainsMono)
- [x] Selected: bg #D4AF3715, border #D4AF37, text #D4AF37 (Cinzel/bold)

### 2. Restore Outer SVG Progress Ring
- [x] SVG Circle progress ring around central breathing circle using react-native-svg
- [x] Animated strokeDashoffset via reanimated createAnimatedComponent
- [x] Ring fills 0%→100% matching exact phase duration (e.g. 4s inhale = 4s fill)
- [x] Ring resets and refills on each phase transition (Inhale→Hold→Exhale→Void)

### 3. Constrain Circle Scale
- [x] Base scale 1.0, max inhale scale 1.1-1.15 (NOT 1.3)
- [x] Ensure no overlap with phase text, rhythm menu, or intent indicators
- [x] Adequate padding/margin around SVG container

### 4. Central Phase Text
- [x] Phase text (Inhale/Hold/Exhale/Void) perfectly centered inside ring
- [x] Cinzel font, white/gold color
- [x] Smooth crossfade on phase transitions

## Stasis Menu Redesign v5

### Setup Screen
- [x] Dropdown selector for breathing patterns (replaces horizontal pill cards)
- [x] Toggle/slider for "Prime for Ritual" – when OFF, ritual list is completely hidden
- [x] When toggle ON, show ritual selection below
- [x] Clean, minimal, dark esoteric aesthetic

### Active Session Screen
- [x] Breathing circle: grows on Inhale, holds on Hold, shrinks on Exhale
- [x] Circle must NOT overlap any info or control elements
- [x] SVG progress ring fills fluidly (not ticking) per phase duration
- [x] Ring resets on each phase transition

## Dynamic Geometry Engine

### CMS Integration
- [x] Add `dynamicSelection` field ('none' | 'element' | 'planet') to SanityRitual type
- [x] Fetch `dynamicSelection` in getRituals() query

### Geometry Dictionary (lib/ritual/geometry.ts)
- [x] Export getRitualGeometry(shape, intent, selection) returning { paths, colorHex }
- [x] Pentagram: Golden Dawn starting points per element (Earth, Air, Water, Fire, Spirit)
- [x] Hexagram: 2 triangle paths (upright + downward) per planet
- [x] Element colors: Earth=Green, Air=Yellow, Water=Blue, Fire=Red, Spirit=White
- [x] Planet colors from PLANET_COLORS constant

### Ritual Store Update
- [x] Add dynamicSelection and selectedElement/Planet to ritual store state
- [x] Save user's selection before launching ritual

### Pre-Ritual Picker UI (sanctum.tsx)
- [x] Check currentRitual.dynamicSelection before Start button
- [x] Element picker: horizontal elegant picker (Fire, Water, Air, Earth, Spirit)
- [x] Planet picker: horizontal elegant picker (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn)

### Holo-Pad Template Parser
- [x] Replace {{SELECTION}} in instruction_text with chosen element/planet name
- [x] Override hardcoded color/shape with getRitualGeometry() when dynamicSelection active
- [x] Pentagram: change starting point and direction based on element
- [x] Hexagram: implement new after Golden Dawn rules

## CMS Ritual Loading Fix

- [x] Rituals are not being fetched from Sanity CMS - only local fallback data is used
- [x] Ensure getRituals() properly queries Sanity and returns CMS rituals
- [x] Ensure sanctum.tsx loads rituals from CMS on mount

## Arsenal & Astral Journal

### Rename Forge → Arsenal
- [x] Rename "Forge" to "Arsenal" in Sanctum hub navigation
- [x] Arsenal contains: Forge (existing bindrune forge) + Astral Journal (new)

### Astral Journal – Core Features
- [x] Create journal store with AsyncStorage persistence (lib/journal/store.ts)
- [x] Journal entry type: ritual name, intent (banish/invoke), dynamic selection, date/time, ruler of day, ruler of hour, active conjunctions/aspects, user notes (freetext), experience intensity rating, daily condition rating, auto-captured data
- [x] Auto-open journal after ritual completion with pre-filled data
- [x] User can skip journal after ritual (auto-data still saved)
- [x] Manual journal entry creation from Arsenal menu

### Astral Journal – Post-Ritual Capture UI
- [x] Elegant post-ritual form: pre-filled ritual data (read-only), freetext notes field, intensity slider/selector, daily condition selector
- [x] Skip button to save auto-data without user input
- [x] Save button to save full entry with user notes

### Astral Journal – Journal List & Statistics
- [x] Journal list view: all entries sorted by date, filterable
- [x] Statistics: ritual frequency per ritual, results by planetary day/hour
- [x] Correlation view: planetary rulers vs user-reported intensity/results
- [x] Elegant dark esoteric UI matching ÆONIS aesthetic

## Multiple UI/UX Improvements (Session 7)

### Header: CMS Level + Mage Name
- [x] Load user rank/level title from CMS level configuration
- [x] Display mage name (from onboarding) in header after ÆONIS
- [x] Display rank/level title before XP display in header

### Alignment Potency Base 45%
- [x] Change alignment potency calculation so base value starts at 45% (currently 0%)
- [x] Higher values should be more easily achievable

### Astral Journal Enhancements
- [x] Record moon phase alongside element in journal entries
- [x] Display aspects as text in addition to symbols
- [x] Add "Feeling" dropdown field (Heat, Cold, Tingling, Pressure, Lightness, Heaviness, Vibration, Calm, Anxiety, Euphoria, None)

### Stasis Circle Fix
- [x] Progress ring (white filling circle) must wrap AROUND the breathing circle, not inside it
- [x] Both circles scale together: smaller on exhale, larger on inhale
- [x] Must not overlap control or information elements
- [x] Phase timing fill animation continues as before

## Session 8 Fixes

### Revert Stasis Circle
- [x] Revert Stasis circle changes from Session 7 (back to previous ring structure)

### Header Layout Fix
- [x] Mage name + level displayed in same size and color as ÆONIS
- [x] Position: directly between ÆONIS and XP display (same row/line)

### Astral Journal – Editable Auto-Fields
- [x] All auto-filled fields (ritual name, intent, dynamic selection, planetary day, planetary hour, moon phase, aspects, XP) must be editable/typeable by user
- [x] User can override auto-captured data if needed

## Session 9 – Stasis Circle Fix

- [x] Circle is way too small – restore proper size (280px area)
- [x] SVG phase progress ring is present and fills during each breath phase
- [x] Ring resets on each phase transition and fills fluidly over the phase duration

## Session 10 – Stasis Circle Full Restore

- [x] Circle enlarged to 300px with 4px stroke, inner breathing ring (264px) added
- [x] SVG progress ring (4px stroke, gradient fill per phase) fully functional with strokeDashoffset animation
- [x] Restored from a8c8c2c3 reference, enhanced with larger dimensions and inner circle

## Session 11 – Remove Extra Inner Ring

- [x] Remove the unwanted inner breathing circle ring from Stasis active session

## Session 12 – Gnosis Module

### Sanctum Integration
- [x] Add GNOSIS to Sanctum hub menu alongside Stasis and Rituals
- [x] Route to GnosisTerminal component when selected

### GnosisTerminal Setup Screen
- [x] Dark minimal setup screen
- [x] Fetch active Bindrune from RuneWallet store, display large and glowing (#D4AF37)
- [x] Duration picker (pill presets, minutes, JetBrainsMono font)
- [x] Audio frequency selector (horizontal scroll): "The Void (432Hz)", "Solar Core (126.22Hz)", "Martian Drive (144.72Hz)"
- [x] "ENTER GNOSIS" start button

### Trance Mode (Active State)
- [x] Hide all UI except glowing Bindrune and minimalist timer
- [x] expo-keep-awake to prevent screen sleep
- [x] expo-audio for looping low-drone frequency audio
- [x] Reanimated pulsing effect on Bindrune (4s in, 4s out breathing rhythm)

### Completion & Logging
- [x] Timer hits 00:00: stop audio, heavy haptic feedback (Success)
- [x] Auto-trigger AstralRecordModal / PostRitualCapture
- [x] Pass payload: ritualName "Gnosis State", intent "INVOKE", current astrological weather
- [x] User can log visions/notes in journal

## Session 13 – Gnosis Wake Lock Fix

- [x] Fix: "The wake lock with tag gnosis has not activated yet" crash on web
- [x] Guard deactivateKeepAwake with isAvailableAsync, keepAwakeActiveRef tracking, and try-catch

## Session 14 – Astral Archives (Unified Journal)

### Architecture & Cleanup
- [x] Remove standalone "Astral Journal" hubView from Sanctum
- [x] Rename Arsenal hub journal tile to "Astral Archives"
- [x] Entry point: Arsenal Hub → Astral Archives card

### Astral Archives UI
- [x] Header: "ASTRAL ARCHIVES" (Cinzel)
- [x] Sleek top segmented control: [CHRONICLE] and [CHRONOS ENGINE]

### Tab 1: Chronicle (Free Tier)
- [x] FlatList of all astral_journal entries, sorted by date descending
- [x] Display Date, Ritual Name, Variant, Intent, Resonance Stars, Notes
- [x] Basic logbook available to all users, no charts, no filters

### Tab 2: Chronos Engine (Adept / Pro Tier)
- [x] Pro gate: Frosted Glass / Blur overlay with paywall modal for non-Pro users
- [x] Filter Terminal: dark JetBrainsMono UI to filter by ritualName, planetaryHour, moonPhase, intent
- [x] Interactive Devotion Matrix: GitHub-style contribution heatmap
- [x] Matrix reactive filtering: non-matching days fade to #1A1A1A, matching glow #D4AF37/#3B82F6
- [x] Matrix tap interaction: tapping a square filters list to that date
- [x] Query Results FlatList below Matrix with terminal header "> [X] RECORDS FOUND"

### Aesthetics
- [x] Vantablack (#050505) backgrounds, gold and neon blue accents
- [x] Custom dark-themed selectors (no native pickers)
- [x] Strict ÆONIS design guidelines throughout

## Session 15 – Gnosis Terminal UI Overhaul

### Kill the Circle
- [x] Remove solid purple background shape (nebulaGlow)
- [x] Pure black (#050505) background throughout active trance

### Enhance Rune (Glow & Weight)
- [x] Increase strokeWidth to 4-6 for bindrune lines
- [x] Glowing Gold (#D4AF37) lines with bloom effect
- [x] SVG multi-layer glow with increased radii for bloom
- [x] Rune looks like glowing light in dark void

### Pulsating Aura
- [x] Soft diffused radial aura behind rune (no hard edges)
- [x] Reanimated breathing pulse over 5 seconds
- [x] Dark ethereal gold / deep occult blue (#1E3A8A) fading to black
- [x] Multiple concentric blur layers for soft radial effect

### Typography & Contrast
- [x] Frequency label: Ash Grey (#A3A3A3) or Gold, readable
- [x] JetBrainsMono, all caps, letterSpacing: 2, centered below rune

### Timer & Button Refinement
- [x] Timer text larger, JetBrainsMono, pure white/light grey
- [x] END SESSION: ghost button (dark grey border, no solid fill)

## Session 16 – Astral Archives Bugfixes

### Record Detail View
- [x] Tapping a record in Chronicle or Query Results opens full journal entry detail
- [x] Detail view shows all fields: date, ritual, variant, intent, resonance, notes, planetary hour, moon phase, aspects

### Devotion Matrix Heatmap
- [x] Fix: Rituals not showing on the Devotion Matrix
- [x] Ensure journal entries are correctly mapped to heatmap date cells
- [x] Verify date key format matches between journal store and matrix generation

## Session 17 – Gnosis Bindrune Container Transparency Fix

- [x] Remove opaque background from tranceRuneContainer (force transparent)
- [x] Remove opaque background from tranceRuneShadow (force transparent)
- [x] Set overflow: visible on all rune wrapper Views and Animated.Views
- [x] Add padding (40px) to tranceRuneContainer for glow dissipation space
- [x] Expand SVG viewBox with 30px padding so bloom layers are not clipped at edges
- [x] Remove Rect fill from SVG, use transparent style on Svg element
- [x] Ensure trancePlaceholder also has transparent background
- [x] Glow fades seamlessly into concentric aura circles without rectangular boundaries

## Session 18 – Gnosis Bindrune Visibility Fix

- [x] Revert SVG viewBox expansion (caused rune to collapse/disappear)
- [x] Restore original viewBox dimensions that were working
- [x] Set explicit width/height on SVG wrapper View (not rely on flex)
- [x] Use native shadow properties on wrapper View for glow (not SVG padding)
- [x] Add zIndex: 10 on rune container to ensure visibility above aura rings
- [x] Verify stroke color #D4AF37 is still explicitly set
- [x] Rune visible and centered on Gnosis trance screen

## Session 19 – Potency Engine Rewrite, Buff HUD, CMS Cosmic Events, Moon Intel Modal

### Potency Engine Rewrite
- [x] Base willpower NEVER below 60% (let potency = 60)
- [x] Additive logic: +15 if planetaryHourMatchesIntent
- [x] Additive logic: +5 if dayRulerMatchesIntent
- [x] Additive logic: +10 if activeCosmicEvent.supportedIntents includes userIntent
- [x] Additive logic: +10 if hasRecentGnosisOrStasis (last 6 hours)
- [x] Max potency capped at 100

### RPG Buff HUD (Alignment Card Redesign)
- [x] Remove old static descriptive text paragraph
- [x] Vertical "Active Buffs" list mapping Potency Engine logic
- [x] Each buff: [Value] left, Buff Name right
- [x] BASE 60% UNYIELDING WILL (Ash Grey, always shown)
- [x] +15% PLANETARY RESONANCE (if planetary hour matches)
- [x] +5% SOLAR DOMINION (if day ruler matches)
- [x] +10% ASTRAL MOMENTUM (if recent Gnosis/Stasis)
- [x] +10% COSMIC CONJUNCTION (if CMS event matches)
- [x] Only render active buffs (except Base which always shows)
- [x] RPG "Mana/Energy" style progress bar starting at 60% minimum
- [x] Bold total percentage on right (e.g. "85% POTENCY")
- [x] Buff values as glowing terminal tags (JetBrainsMono, rgba gold bg)
- [x] Buff names in Cinzel or clean sans-serif

### Sanity CMS: cosmicEvent Integration
- [x] Add SanityCosmicEvent type with magickalDirective, warning, supportedIntents
- [x] Add GROQ query to fetch active cosmicEvent documents
- [x] Match live astrological data with CMS entries
- [x] Inject magickalDirective and warning into app state

### Event Modal Upgrade
- [x] Display magickalDirective from CMS under [MAGICKAL DIRECTIVE] header
- [x] Display warning from CMS
- [x] JetBrainsMono Gold for directive header
- [x] Hide dry astronomical separation data

### Moon Intel Modal
- [x] Make Moon Phase tile interactive (onPress)
- [x] Dark-themed modal with phase name in Cinzel
- [x] [CURRENT STATE] section: Illumination, Zodiac sign
- [x] [MAGICKAL AFFINITY] section: what intents this phase supports
- [x] Phase-specific magickal recommendations

### Aesthetics
- [x] Vantablack (#050505) backgrounds throughout
- [x] Cyber-Occult aesthetic strict adherence

## Session 20 – Cyclic Ritual Loop Feature

### GROQ Query Update
- [x] Fetch `isRepeatable` and `repeatFromStep` in ritual GROQ query
- [x] Add `isRepeatable` and `repeatFromStep` to Ritual type

### Ritual Store: Loop Action
- [x] Add `jumpToStep(stepOrder: number)` action to ritual store
- [x] jumpToStep finds the step index where step.order === stepOrder
- [x] jumpToStep resets direction/tracing state for the target step
- [x] Add `cycleCount` state to track how many loops the user has done

### Completed Screen UI
- [x] Check if ritual.isRepeatable === true on completed screen
- [x] If repeatable: show dual buttons [DESCEND DEEPER] + [SEAL & CONCLUDE]
- [x] [DESCEND DEEPER]: ghost/outline button, Cinzel, SIDERUM Gold glow border
- [x] [SEAL & CONCLUDE]: solid dark button, standard end/complete
- [x] If not repeatable: show existing single completion flow
- [x] Display cycle count if > 0 ("Cycle X completed")

### Loop Logic
- [x] DESCEND DEEPER: do NOT trigger addXp or completion
- [x] DESCEND DEEPER: jump to step where step.order === repeatFromStep
- [x] DESCEND DEEPER: haptic feedback (Medium)
- [x] DESCEND DEEPER: increment cycle count
- [x] SEAL & CONCLUDE: trigger normal completion (XP, journal, etc.)
- [x] User can loop infinitely

### Aesthetics
- [x] Loop button: glowing gold border (#D4AF37), vantablack background
- [x] Cycle counter in JetBrainsMono
- [x] ÆONIS aesthetic throughout

## Session 21 – Event Horizon CMS Intel Feed

### List Item CMS Cross-Reference
- [x] Match each AstroEvent to a SanityCosmicEvent by type + planets (aspectKey matching)
- [x] Show magickalDirective preview (2 lines) below date in each event card
- [x] Fallback text "> Awaiting cosmic intel..." if no CMS match found

### Typography & Aesthetics
- [x] Preview text: JetBrainsMono, fontSize 11-12, Ash Grey (#A3A3A3)
- [x] Left border on directive preview (borderLeftWidth: 2, borderLeftColor: #D4AF37, paddingLeft: 8)
- [x] Terminal readout aesthetic

### Modal Upgrade
- [x] Full magickalDirective in expanded event modal (replace dry API notes)
- [x] Full warning from CMS in modal
- [x] Improve matching logic: match by event type + planet names
