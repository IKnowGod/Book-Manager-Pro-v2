# Feature: Global Book & Note Search

## Status: Not Implemented

## Objective
Implement a fast global search that lets users find notes across all books by keyword, note type, or tag. This is a high-utility quality-of-life feature not present in the old app but essential for users with large libraries.

## Difficulty: Easy to Medium

## Technologies
- **Backend:** Express, Prisma (full-text search via `contains`)
- **Frontend:** React, React Router

## Tasks

### SR1. Backend — Search Endpoint
- Add `GET /search` or `GET /books/:bookId/search` to a new `backend/src/routes/search.ts` file.
- **Query parameters**: `q` (keyword), `bookId` (optional), `type` (optional: character/chapter/detail), `tag_ids` (optional, comma-separated).
- **Prisma query**:
  ```ts
  prisma.note.findMany({
    where: {
      AND: [
        bookId ? { bookId } : {},
        q ? { OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } }
        ]} : {},
        type ? { type } : {},
        tag_ids ? { tags: { some: { tagId: { in: ids } } } } : {}
      ]
    },
    include: { tags: { include: { tag: true } }, book: { select: { title: true, id: true } } },
    take: 50
  })
  ```
- Response: array of notes each including `book.title` and `book.id` (encoded).
- Register router in `backend/src/main.ts`.

### SR2. Frontend — API Client Method
- Add `api.search(query, bookId?, type?, tagIds?)` to `client.ts`.

### SR3. Frontend — Search Bar in Sidebar Header
- Add a search input to `Sidebar.tsx` (below the logo section).
- On input change (debounced ~300ms), redirect to `/search?q=<query>` (global search) or include `bookId` if a book is active.
- Include a clear button (×) to reset.

### SR4. Frontend — Search Results Page
- Create `frontend/src/pages/SearchPage.tsx` and `SearchPage.css`.
- **Route**: `/search`
- **Behavior**:
  - Reads `?q=` from URL search params.
  - Fetches from the search endpoint on mount/query change.
  - Shows results as a list with: type icon, note title, book name (linked to that book), content excerpt (50 chars), tags.
  - If no results, show empty state: "No notes found for '{query}'."
  - Group results by book (optional enhancement).

### SR5. Frontend — Routing
- Add route `search` to `App.tsx`.

## Deliverables
- `GET /search` backend endpoint with keyword + filter support.
- `api.search()` client method.
- Search input in `Sidebar.tsx` with debounced navigation.
- `SearchPage.tsx` displaying results with note type, book, tag, and excerpt.

## Verification
- Type a keyword in the sidebar search → verify redirect to `/search?q=<keyword>`.
- Results page shows matching notes with correct book names.
- Filter by note type → verify results reduce to that type.
- Search for a term present in note content but not title → verify it still appears.
- Clear search → verify empty state is rendered.
