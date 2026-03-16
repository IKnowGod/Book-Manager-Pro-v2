# Feature: Note Editor

The Note Editor is the primary interface for creating and modifying content in the Book Manager Pro v2.

## Component Overview
- **File**: `frontend/src/pages/NoteEditorPage.tsx`
- **Styles**: `frontend/src/pages/NoteEditorPage.css`

## Key Capabilities
- **Note Types**: Supports `character`, `chapter`, and `detail`.
- **Dynamic Labels**: To improve context, the primary input label changes based on the note type:
  - `character` -> **NAME**
  - `chapter`/`detail` -> **TITLE**
- **AI Integration**:
  - **Tag Suggestions**: Uses Gemini to suggest relevant tags.
  - **Tag Management**: Optimized to handle tag creation and addition in a single click, with automatic filtering of existing tags from suggestions to prevent duplicates.
  - **Auto-Tagging**: Automatically adds tags for the note's type (character, chapter, detail) and title/name on every save.
  - **Consistency Check**: Analyzes note content against the entire book database to detect contradictions.
- **Folder Assignment**: Allows moving notes between folders.

## State Management
- Uses local React state for form inputs (`title`, `type`, `content`, `folderId`).
- Persists changes via the `api.notes.update` and `api.notes.create` backend calls.

## Navigation
- Accepts search parameters like `folderId` and `type` for pre-populating new notes.
- Supports inconsistency deep-linking via `highlight` and `inconsistency` URL parameters.
