# Feature: Narrative & Thematic Analysis (AI)

## Status: Not Implemented

## Objective
Move beyond simple consistency checks into advanced AI-powered narrative analysis. The AI will analyze chapter text to identify character interactions, dialogue frequency, and thematic presence across the book — presenting results as visualized data on a dedicated analysis page.

## Parent Context
- Ported from old app: `phase_4c_narrative_thematic_analysis.md`

## Difficulty: Hard

## Technologies
- **Backend:** Express, Prisma, Google Generative AI SDK (existing `gemini.ts` service)
- **Frontend:** React, Recharts (shared with `feature_chapter_timeline.md`)

## Tasks

### N1. Backend — Character Interaction Analysis Endpoint
- Add `POST /books/:bookId/analyze-interactions` to `backend/src/routes/books.ts` (or a new `analysis.ts` route).
- **Request body**: `{ "content": "<chapter or body text to analyze>" }`
- **AI Prompt**: Ask Gemini to return a structured JSON with:
  - `character_interactions`: array of `{ characters: string[], summary: string }`
  - `dialogue_count`: object `{ [characterName: string]: number }`
- **Example prompt** (adapt from old app's phase_4c):
  ```
  Analyze the following text. Identify all characters mentioned and list every meaningful interaction 
  between two or more characters. Count the number of dialogue lines spoken by each character.
  Return JSON: { "character_interactions": [{ "characters": ["A","B"], "summary": "..." }], 
  "dialogue_count": { "A": 5, "B": 3 } }
  ```
- Strip markdown code fences from response before parsing (use existing `cleanJsonResponse` pattern).
- Return parsed JSON to frontend.

### N2. Backend — Thematic Presence Analysis Endpoint
- Add `POST /books/:bookId/analyze-themes` endpoint.
- **Request body**: `{ "summaries": [{ "chapter": "Ch 1", "text": "..." }, ...] }` (array of chapter summaries)
- **AI Prompt**: Ask Gemini to identify primary themes and list the chapters each appears in.
- **Response**: `{ [theme: string]: string[] }` — e.g. `{ "Betrayal": ["Chapter 1", "Chapter 3"] }`
- Validate and parse response; return to frontend.

### N3. Backend — TypeScript Interfaces
- Define `InteractionAnalysisResponse` and `ThemeAnalysisResponse` interfaces in `gemini.ts`.
- Export new `analyzeInteractions()` and `analyzeThemes()` functions.

### N4. Frontend — Book Analysis Page
- Create `frontend/src/pages/AnalysisPage.tsx` and `AnalysisPage.css`.
- **Route**: `/books/:bookId/analysis`
- **Layout**:
  - Tab navigation: "🧑 Character Interactions" | "🎭 Themes"
  - **Character Interactions** tab:
    - Textarea input for pasting chapter content (or fetch latest chapter as default).
    - "Run Analysis" button with loading state.
    - **Dialogue Chart**: `BarChart` (recharts) showing dialogue count per character.
    - **Interaction Map**: A simple table or card list showing each interaction pair and summary.
  - **Themes** tab:
    - Auto-fetches all chapter notes' content on load.
    - "Analyze Themes" button.
    - **Thematic Timeline**: A table/grid with themes as rows and chapter titles as columns; cells indicate presence (✓ / —).
- Error display for AI failures.

### N5. Frontend — API Client Methods
- Add `api.books.analyzeInteractions(bookId, content)` and `api.books.analyzeThemes(bookId, summaries)` to `client.ts`.

### N6. Frontend — Routing & Sidebar Link
- Add route `books/:bookId/analysis` to `App.tsx`.
- Add "🔬 Analysis" `NavLink` to `Sidebar.tsx`.

## Deliverables
- Two new backend AI endpoints: `analyze-interactions` and `analyze-themes`.
- `analyzeInteractions()` and `analyzeThemes()` in `gemini.ts`.
- `AnalysisPage.tsx` with tab UI, charts, and theme grid.
- API client methods, route, and sidebar link.

## Verification
- Paste a chapter into the Interactions tab → "Run Analysis" → verify bar chart and interaction table populate.
- With 3+ chapters that have content, click "Analyze Themes" → verify theme table renders row/column matrix.
- Verify AI errors are surfaced gracefully (e.g., test with invalid/empty content).
