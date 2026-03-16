# Feature: Book Settings & Statistics Page

## Status: Not Implemented

## Objective
Implement a dedicated Settings page for each book, accessible from the sidebar. This page will display live book statistics (note counts by type, tag counts, inconsistency counts) and allow the user to rename or delete the book. It replaces the placeholder that existed in the old app.

## Parent Context
- Ported from old app: `phase_2_sidebar_settings.md`
- Related to: `feature_inconsistency_management.md`

## Difficulty: Easy to Medium

## Technologies
- **Backend:** Express/Prisma (existing endpoints sufficient; one new stats endpoint needed)
- **Frontend:** React, React Router, existing CSS design system

## Tasks

### S1. Backend — Book Stats Endpoint
- Create `GET /books/:id/stats` endpoint in `backend/src/routes/books.ts`.
- **Response shape**:
  ```json
  {
    "noteCount": 12,
    "characterCount": 4,
    "chapterCount": 6,
    "detailCount": 2,
    "tagCount": 9,
    "activeInconsistencies": 3,
    "resolvedInconsistencies": 2,
    "ignoredInconsistencies": 1
  }
  ```
- Use `prisma.note.groupBy` for type counts and `prisma.inconsistency.groupBy` for status counts.

### S2. Frontend — API Client Method
- Add `api.books.stats(bookId)` to `frontend/src/api/client.ts`.

### S3. Frontend — Settings Page Component
- Create `frontend/src/pages/SettingsPage.tsx` and `SettingsPage.css`.
- **Route**: `/books/:bookId/settings`
- **Sections**:
  1. **Book Info** — Display title, creation date. Inline edit for title (click to edit, save on blur/enter).
  2. **Statistics** — Display stat cards for: Total Notes, Characters, Chapters, Details, Tags, Active Inconsistencies.
  3. **Danger Zone** — "Delete Book" button triggering a confirmation Modal (reuse existing `Modal` component). On confirm, delete and navigate to `/books`.

### S4. Frontend — Routing
- Add route `books/:bookId/settings` to `App.tsx`.

### S5. Frontend — Sidebar Link
- Add a "⚙️ Settings" `NavLink` at the bottom of `Sidebar.tsx` that points to the currently active book's settings page. The link should only appear when a book route is active.
- Use `useParams` or context to detect the current `bookId`.

## Deliverables
- `GET /books/:id/stats` backend endpoint.
- `api.books.stats()` frontend client method.
- `SettingsPage.tsx` with statistics, rename, and delete functionality.
- Route and sidebar integration.

## Verification
- Navigate to a book → click "Settings" in sidebar → verify stats match actual note/tag counts.
- Rename a book → refresh page → confirm new title persists.
- Delete a book from settings → confirm redirect to `/books` and book is removed from sidebar.
