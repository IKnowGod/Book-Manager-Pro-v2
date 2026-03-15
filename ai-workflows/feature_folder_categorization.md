---
description: How to maintain and expand the hierarchical folder categorization feature.
---
# Feature: Hierarchical Folder Categorization
The application supports categorizing notes into a deeply nested `Folder` hierarchy. This documentation explains the architecture of the folder feature.

## Database Schema Highlights
The Prisma schema includes a `Folder` model with a self-referencing relationship:
- `parentId`: Integer. If `null`, it's a root folder. If set, it refers to another `id` in the `Folder` table.
- A `Note` may optionally include a `folderId`.

## Automatic Tagging
When a `Note` is assigned to a `folderId` via the backend endpoints (`POST /api/books/:id/notes` or `PUT /api/notes/:id`):
- The `routes/notes.ts` triggers a function `applyFolderTags()`.
- This function resolves the folder hierarchy recursively (up to an arbitrary safety depth of 20) and collects the folder names.
- It automatically creates (if necessary) and assigns these names as `TagsOnNotes`.

**Important**: This approach currently *adds* the tags, meaning that if a note is moved out of a folder, the tags remain for archival purposes unless explicitly deleted by a user.

## Frontend UI Rules
- `FolderTree.tsx`: Handles rendering the directory tree. It fetches data once via `api.folders.list()`. To simplify state, any actions (`create`, `update`, `delete`) will execute the backend API hit and then re-fetch the entire tree.
- **Filtering**: Clicking a folder updates the URL param `?folderId=...`. The parent routing component (like `BookDetailPage.tsx`) pulls this URL param and adjusts its `Array.prototype.filter()` algorithm to only display notes that explicitly share that `folderId`.
- **Inheritance vs Explicit Filtering**: Notes inside `chapters/working` are NOT shown when clicking the root `chapters` folder unless explicitly assigned to `chapters`. Only an exact `folderId` match renders them. If inheritance UI rendering is desired in the future, the filtering algorithm on the frontend must collect all descendant `Folder.id` arrays.
