# Feature: Inconsistency Management Page

## Status: Backend Implemented — Frontend Page Missing

## Objective
Create a dedicated full-page view for browsing, filtering, and managing all AI-identified inconsistencies across all notes in a book. The backend routes already exist in `backend/src/routes/inconsistencies.ts`. This feature requires only frontend work.

## Parent Context
- Ported from old app: `phase_9_inconsistency_management.md`
- Backend: `GET /inconsistencies`, `PUT /inconsistencies/:id`, `DELETE /inconsistencies/:id` ✅ Done

## Difficulty: Medium

## Technologies
- **Frontend:** React, React Router, existing CSS design system

## Tasks

### I1. Frontend — InconsistenciesPage Component
- Create `frontend/src/pages/InconsistenciesPage.tsx` and `InconsistenciesPage.css`.
- **Route**: `/books/:bookId/inconsistencies`
- **Data Fetching**: Call `GET /inconsistencies?book_id=:bookId` on mount.
- **Layout**:
  - Header: "⚠️ Inconsistencies" title + count badge.
  - Filter bar: Tab buttons for `All`, `Active`, `Ignored`, `Resolved`.
  - List: Each inconsistency entry card showing:
    - Note title (linked to `/books/:bookId/notes/:noteId`)
    - Description text
    - `offendingText` displayed as a blockquote
    - Status badge
    - Action buttons: "✓ Resolve", "Hide", "🗑 Delete"
  - Empty state when no inconsistencies match the selected filter.

### I2. Frontend — API Client Methods
- Verify `api.inconsistencies.list(bookId?)`, `api.inconsistencies.update(id, status)`, `api.inconsistencies.delete(id)` exist in `frontend/src/api/client.ts`. Add if missing.

### I3. Frontend — Routing
- Add route `books/:bookId/inconsistencies` to `App.tsx`.

### I4. Frontend — Sidebar Link
- Add "⚠️ Issues" `NavLink` to `Sidebar.tsx` pointing to the current book's inconsistencies page.
- Show a red count badge if there are `active` inconsistencies for the current book (can be passed as a prop from the parent or fetched via a lightweight API call inside Sidebar).

### I5. Frontend — Note Editor Integration
- In `NoteEditorPage.tsx`, the AI Consistency panel currently shows only `active` inconsistencies from the latest scan.
- Enhance it to also show **persisted** inconsistencies from the database (both `active` and `ignored`), disambiguating between "new from this scan" and "previously flagged".

## Deliverables
- `InconsistenciesPage.tsx` with filtering, status updates, delete, and note linking.
- Route registered in `App.tsx`.
- Sidebar navigation link with optional badge count.
- Enhanced inconsistency display in `NoteEditorPage.tsx`.

## Verification
- Create a note → run consistency check → navigate to Inconsistencies page → confirm items appear.
- Click "Resolve" → confirm status changes to "resolved" and item disappears from "Active" filter.
- Click the note title link → confirm navigation to that note's editor.
- Delete an inconsistency → confirm it is removed from the list.
