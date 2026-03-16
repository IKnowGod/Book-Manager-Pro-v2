---
description: Advanced Editor: Auto-Save & Conflict Resolution
---
# Advanced Editor: Auto-Save & Conflict Resolution

Ensures data integrity and prevents loss if the browser crashes or multiple tabs are open.

## 1. Auto-Save Logic (Frontend)
- **Implementation**:
    - Add a `useEffect` hook in `NoteEditorPage.tsx` that triggers a debounced save (e.g., 5-10 seconds) after the user stops typing.
    - Show a subtle "Saving..." / "All changes saved" indicator in the editor header.
    - Use `localStorage` as a secondary backup to recover drafts if the server is unreachable.

## 2. Conflict Resolution (Optimistic UI)
- **Implementation**:
    - Before saving, check the `updatedAt` timestamp from the server.
    - If the server's version is newer than the local version (another tab might be open), prompt the user with a "Resolve Conflict" modal.

## 3. Version Comparison (Frontend)
- **Implementation**:
    - Allow users to see the differences side-by-side using the `NoteVersion` data (if implemented).

## Verification
- Type a note and wait 10 seconds.
- Refresh the page and verify all content is still there, even without clicking "Save".
- Open the same note in two tabs, edit one, then try to edit the other and verify a conflict warning appears.
