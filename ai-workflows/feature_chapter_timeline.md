# Feature: Chapter Timeline Visualization

## Status: Not Implemented

## Objective
Provide a visual representation of character and tag occurrences across chapters using interactive bar charts. This helps users understand character prominence and thematic distribution throughout the book at a glance.

## Parent Context
- Ported from old app: `phase_7_chapter_timeline.md`

## Difficulty: Medium

## Technologies
- **Backend:** Existing note and tag endpoints (no new backend needed)
- **Frontend:** React, Recharts (charting library — needs install), React Router

## Tasks

### T1. Frontend — Install Recharts
- Run `npm install recharts` in the `frontend/` directory.
- Ensure TypeScript types are available: `npm install -D @types/recharts` (if not bundled).

### T2. Backend — No New Endpoints Required
- All data is available via:
  - `GET /books/:bookId/notes?type=chapter` — all chapter notes
  - `GET /books/:bookId/notes?type=character` — all character notes
  - `GET /books/:bookId/notes` — all notes (for tag analysis)
  - `GET /tags/` — all tags

### T3. Frontend — ChapterTimeline Component
- Create `frontend/src/pages/ChapterTimelinePage.tsx` and `ChapterTimelinePage.css`.
- **Route**: `/books/:bookId/timeline`
- **Data processing**:
  - Fetch all notes for the book.
  - For each chapter note: detect which character notes are mentioned in the content (using flexible matching for partial names like "Damien" for "Damien Parker") or share tags with it.
  - Build a dataset of `{ chapter: "Chapter 1", "Damien Parker": 1, ... }` for the character chart.
  - Build a dataset of `{ chapter: "Chapter 1", tagName: count, ... }` for the tag chart.
- **Charts (using Recharts)**:
  1. **Character Presence Chart** — `BarChart` showing which characters (character notes) are referenced across chapters. X-axis: chapter titles, Y-axis: occurrence count per character.
  2. **Tag Distribution Chart** — `BarChart` showing tag usage across chapters. X-axis: chapter titles, Y-axis: count per tag.
- **UI**:
  - Toggle between the two charts with tab buttons.
  - Responsive container wrapping each chart.
  - Legend showing character/tag names with color coding.
  - Empty state if fewer than 2 chapters exist.

### T4. Frontend — Routing
- Add route `books/:bookId/timeline` to `App.tsx`.

### T5. Frontend — Sidebar Link
- Add "📊 Timeline" `NavLink` to the per-book navigation section of `Sidebar.tsx`.

## Deliverables
- `recharts` installed in frontend.
- `ChapterTimelinePage.tsx` with two interactive bar charts.
- Route and sidebar integration.

## Verification
- Create at least 3 chapter notes and 2 character notes, add shared tags.
- Navigate to Timeline page → verify charts render without error.
- Hover over bars → verify tooltips display correctly.
- Switch chart tabs → verify both charts are functional.
