---
description: Note Revision History & Visual Diffs
---
# Note Revision History & Visual Diffs

Allows authors to track historical versions of their notes and see what changed visually.

## Database Changes
1. **New Model `NoteVersion`**:
   - `id`: Auto-increment
   - `noteId`: Relation to Note
   - `content`: Text
   - `createdAt`: DateTime
   - `index`: Number (0-14)

## Backend Implementation
1. **Version Rotation Logic**:
   - On every `PUT /api/notes/:id`, if the content has changed, save the previous content to `NoteVersion`.
   - Keep only the last 15 versions per note (FIFO).
   - Exclude changes to tags, related notes, or metadata.
2. **Settings API**:
   - `DELETE /api/books/:id/history`: Purge all `NoteVersion` records for a book (keeping the current `Note.content`).
   - `GET /api/books/:id/stats/versions`: Count total version records.

## Frontend Implementation
1. **History Tab**:
   - Add a "History" tab to the `NoteEditorPage.tsx`.
   - List the last 15 versions with timestamps.
2. **Visual Diff Component**:
   - Use `diff-match-patch` or `react-diff-viewer`.
   - Show a "Red/Green" side-by-side comparison between the current draft and a selected version.
3. **Book Settings Update**:
   - Add a "Maintenance" section in `SettingsPage.tsx` with the "Clear History" button.

## Verification
- Edit a note 16 times.
- Verify the 1st version is removed and 15 are maintained.
- Open the Diff viewer and verify additions/deletions are highlighted correctly.
