# Project Notes
- 2026-03-15: Fixed tag double-click issue and improved AI suggestion filtering in Note Editor.
- 2026-03-15: Implemented auto-tagging on save for note type and title.
- Book Manager Pro v2

This file tracks the evolution of the project, covering key decisions, identified bugs, and future feature ideas.
 
## 2026-03-14: API Routing & Database Path Fixes
- **Problem**: Frontend received 404 errors for `/api/books` and books appeared "gone."
- **Root Cause**: Vite proxy was stripping `/api` prefix, and backend routes were inconsistently mounted. Backend `.env.local` was pointing to `dev.db` instead of `prisma/dev.db`.
- **Fix**: Standardized all backend routes to be mounted under `/api`. Updated individual router files (`books.ts`, `tags.ts`, etc.) to include their respective path prefixes. Fixed `DATABASE_URL` in `.env.local`. Updated `vite.config.ts` to preserve the `/api` prefix when proxying.
- **Result**: Data connectivity restored; books and notes are now correctly displayed in the UI.

## 2026-03-13: Rebuild Initiation
- Created initial implementation plan for rebuilding the application in TypeScript (React + Node.js).
- Defined new phase-based workflows for the migration.

## 2026-03-13: Full TypeScript Rebuild Complete
- Backend: Express + TypeScript + Prisma (SQLite) with Zod validation, Helmet, rate-limiting.
- Frontend: Vite + React 18 + TypeScript with premium dark glassmorphism design.
- AI features: Gemini-powered consistency checking and tag suggestions fully ported.
- Both frontend and backend TypeScript compile with zero errors.
- **NEXT**: Open `backend/.env` and replace `GEMINI_API_KEY` placeholder with your real key.
- **2026-03-15**: Initialized Git repository, connected to GitHub, and performed security audit to ensure no secrets are tracked. Updated .gitignore for better exclusion.
- **NEXT**: Run `npm run dev` in both `backend/` and `frontend/` to start the app.
- 2026-03-13: Implemented a grid/list view toggle for the BookDetailPage notes list.
- 2026-03-13: Fixed missing spacing below the list/grid toggle by adding `.mb-6` to global css.

## Future Features (Carried over from `_old app`)
- Enhanced Note Linking and Referencing.
- Advanced Search with Contextual Snippets.
- AI-Powered Content Analysis for Relationships and Prominence.

## 2026-03-13: Feature Gap Analysis Complete
- Performed full diff between old Python app's `ai-workflows/` (14 files) and new TypeScript app's implementation.
- **Backend** is fully caught up: Books, Notes, Tags, Inconsistencies, AI Consistency Check, AI Tag Suggestions all implemented.
- **6 features are missing** from the frontend. New workflow MD files written for each:
  - `ai-workflows/feature_settings_page.md` — Book stats, rename, delete settings page.
  - `ai-workflows/feature_inconsistency_management.md` — Dedicated inconsistency list/management page (backend already done).
  - `ai-workflows/feature_book_search.md` — Global keyword + filter search across all notes.
  - `ai-workflows/feature_chapter_timeline.md` — Recharts bar charts showing character/tag presence across chapters.
  - `ai-workflows/feature_narrative_analysis.md` — AI-powered character interaction + thematic analysis with visualization.
  - `ai-workflows/feature_note_linking.md` — AI-suggested note linking with approval workflow (requires DB migration).
- Sub-agent implementation plan written. Features ordered: Settings → Inconsistencies → Search → Timeline → Analysis → Linking.

## 2026-03-13: All 6 Missing Features Implemented
- **Feature 1 — Settings & Stats Page**: `GET /books/:id/stats` endpoint, `SettingsPage.tsx` with stat cards, inline rename, danger-zone delete, sidebar ⚙️ Settings link.
- **Feature 2 — Inconsistency Management Page**: `InconsistenciesPage.tsx` with status filter tabs, resolve/ignore/active actions, delete, note links, sidebar ⚠️ Issues link.
- **Feature 3 — Global Search**: `search.ts` backend route, `SearchPage.tsx` with keyword + type filter, results grouped by book, sidebar search input with debounce.
- **Feature 4 — Chapter Timeline**: Installed `recharts`, `ChapterTimelinePage.tsx` with character-presence BarChart + tag-distribution BarChart + summary presence/absence table, sidebar 📊 Timeline link.
- **Feature 5 — Narrative & Thematic Analysis**: `analyzeInteractions()` + `analyzeThemes()` in `gemini.ts`, two POST endpoints on books router, `AnalysisPage.tsx` with Interactions tab (dialogue bar chart + interaction cards) + Themes tab (theme × chapter matrix), sidebar 🔬 Analysis link.
- **Feature 6 — Automatic Note Linking**: `NoteLink` Prisma model added + migration `add_note_links` applied, `suggestLinks()` AI function in `gemini.ts`, `links.ts` backend router (suggest, CRUD), `RelatedNotesPanel.tsx` component in `NoteEditorPage.tsx` sidebar.
- **Frontend TypeScript**: Zero compile errors (`npx tsc --noEmit`).
- **Backend**: `prisma.noteLink` type will resolve on backend restart (DLL lock from running dev server regeneration).

## 2026-03-14: Inconsistency Navigation & Chapter Highlighting
- **Problem**: Inconsistencies pointed to character notes, but the bad text was in chapter notes.
- **Backend**: Added `chapterNoteId` to `Inconsistency` Prisma model. Updated `gemini.ts` checkConsistency prompt to return `source_note_id` so the inconsistency is linked to the chapter.
- **Frontend**: Updated `InconsistenciesPage.tsx` to include a clickable "Found in chapter" link that navigates to the chapter with `?highlight=...` URL params. Added a warning banner and auto-text-selection to `NoteEditorPage.tsx` to highlight the offending text.

## 2026-03-13: AI Tag Suggestions — Guaranteed Character Tags
- `suggestTags()` in `gemini.ts` now always includes character names as tags on top of the AI content analysis: fetches all `character` notes from the same book, detects which names appear in the current note's content, and merges them into `matched_tags` (if the name is already a tag) or `new_suggestions` (if it is not).

- 2026-03-13: Implemented a visual feedback modal in `NoteEditorPage.tsx` that appears after successful note saves.

## 2026-03-14: Folder Categorization for Notes
- Implemented hierarchical folders for books. Added `Folder` model to Prisma schema representing a tree structure.
- Updated `Note` model to support an optional `folderId`. Notes saved to a folder automatically receive the folder's name (and parent folder names) as tags using an upwards-hierarchy traversal algorithm in the `POST/PUT` notes endpoints.
- Built a nested `<FolderTree />` component in the `Sidebar` to display, create, rename, and delete folders recursively. Clicking a folder filters the `BookDetailPage` notes list.
- Upgraded `NoteEditorPage` to include a folder selector dropdown so users can organize notes at creation or edit time.
- **Sidebar Refinement**: Re-organized the sidebar to nest per-book navigation (Timeline, Analysis, Issues, Settings) and the `FolderTree` directly under each book entry. Added slide-down animations and hierarchical indentation for a more intuitive multi-book experience.
- Fix: Implemented a global `refresh-folders` window event to automatically update sidebar folder counts when notes are created, moved, or deleted.

## 2026-03-14: Refactored Browser Dialogs to Application Modals
- Replaced all usages of native `prompt()`, `confirm()`, and `alert()` with the custom `Modal` component.
- Affected areas: Folder management (Create/Rename/Delete), New Book creation, Note deletion, and Inconsistency record deletion.
- Added support for in-modal error messaging and loading states to improve the user experience and maintain design consistency.
2026-03-13: Changed 'TITLE' label to 'NAME' in NoteEditorPage.tsx when note type is 'character'.
## 2026-03-14: Organized Notes by Category
- Reorganized the book detail page to group notes into categorized sections: **Characters**, **Chapters**, and **Details**.
- Added section headers with icons and note counts.
- Refactored note rendering into a separate `NoteCard` component.
- Ensured category grouping is maintained in both Grid and List views.
2026-03-14: Fixed AI consistency check logic to include related notes across all types if titles are mentioned (in backend/src/services/gemini.ts).
2026-03-14: Updated Issues page 'Fix it' navigation to correctly link to the flawed note, not the context note (in frontend/src/pages/InconsistenciesPage.tsx).
2026-03-14: Abstracted AI functionality into a dynamically configurable provider system (Gemini / OpenAI) via a new GlobalSettingsPage UI and database Setting model.
- 2026-03-15: Implemented advanced AI authoring tools including Narrative Pacing Analysis, Beta-Reader Feedback, and Plot Hole Scanner.
- 2026-03-15: Created detailed README.md highlighting AI capabilities and technical architecture.
