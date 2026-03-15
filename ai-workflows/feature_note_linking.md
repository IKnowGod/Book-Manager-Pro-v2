# Feature: Automatic Note Linking

## Status: Not Implemented

## Objective
Implement an intelligent system for automatically suggesting links between notes based on their content. When a user is editing a note, the AI will scan the note content for mentions of other entities (characters, places, events) and suggest links to related notes. Users can approve or reject suggestions.

## Parent Context
- Ported from old app: `phase_8_automatic_note_linking.md`

## Difficulty: Hard

## Technologies
- **Backend:** Express, Prisma, Google Generative AI SDK
- **Frontend:** React, React Router

## Tasks

### L1. Database Schema — NoteLinks Table
- Add a `NoteLink` model to `backend/prisma/schema.prisma`:
  ```prisma
  model NoteLink {
    id         Int      @id @default(autoincrement())
    sourceId   Int
    targetId   Int
    linkType   String   // e.g. "character_mention", "plot_reference", "thematic"
    status     String   @default("pending") // "pending", "approved", "rejected"
    sourceNote Note     @relation("SourceLinks", fields: [sourceId], references: [id], onDelete: Cascade)
    targetNote Note     @relation("TargetLinks", fields: [targetId], references: [id], onDelete: Cascade)
    createdAt  DateTime @default(now())
  }
  ```
- Update the `Note` model to add the two relations (`sourceLinks`, `targetLinks`).
- Run `npx prisma migrate dev --name add_note_links`.

### L2. Backend — AI Link Suggestion Service
- Add `suggestLinks(noteId: number, prisma: PrismaClient)` function to `backend/src/services/gemini.ts`.
- **Logic**:
  1. Fetch the source note's title and content.
  2. Fetch all other notes in the same book (titles + first 200 chars of content).
  3. Prompt Gemini: "Given the source note content, identify which of the following notes are mentioned or closely referenced. Return a JSON array of: `{ targetTitle: string, linkType: string, reason: string }`".
  4. Match returned titles to actual note IDs.
  5. Return structured suggestions.

### L3. Backend — Note Linking Endpoints
- Create `backend/src/routes/links.ts` with:
  - `POST /notes/:id/suggest-links` — Calls `suggestLinks()` AI service, returns suggestions (does NOT auto-save; returns JSON for user review).
  - `POST /notes/:id/links` — Body: `{ targetId, linkType }`. Saves a `NoteLink` with `status: "approved"`.
  - `GET /notes/:id/links` — Returns approved links for a note (with target note title and type).
  - `DELETE /links/:id` — Remove a link.
- Register router in `backend/src/main.ts`.

### L4. Frontend — API Client Methods
- Add to `client.ts`:
  - `api.notes.suggestLinks(noteId)` → `POST /notes/:id/suggest-links`
  - `api.notes.getLinks(noteId)` → `GET /notes/:id/links`
  - `api.notes.addLink(noteId, targetId, linkType)` → `POST /notes/:id/links`
  - `api.links.delete(linkId)` → `DELETE /links/:id`

### L5. Frontend — NoteEditorPage Integration
- Add a new "🔗 Related Notes" section to the AI Panel in `NoteEditorPage.tsx`.
- **Approved Links**: Show a list of approved links as clickable cards that navigate to the linked note.
- **Suggest Links Button**: "✦ AI Suggest Links" button (only for saved notes) — triggers `suggestLinks` AI call.
- **Suggestion Review UI**: When suggestions are returned, display each as a card with:
  - Target note title and type badge.
  - Reason.
  - "✓ Approve" and "✗ Reject" buttons.
  - On approve: call `addLink`; on reject: dismiss.

### L6. Frontend — Types
- Add `NoteLink` and `LinkSuggestion` interfaces to `frontend/src/types.ts`.

## Deliverables
- `NoteLink` Prisma model + migration.
- `suggestLinks()` AI function in `gemini.ts`.
- `links.ts` backend routes registered in `main.ts`.
- API client methods in `client.ts`.
- "Related Notes" panel in `NoteEditorPage.tsx` with suggestion review UX.
- TypeScript types in `types.ts`.

## Verification
- Create 3+ interconnected notes → open one → click "AI Suggest Links" → verify suggested links appear.
- Approve a link → verify it appears in "Approved Links" section and persists on page refresh.
- Click an approved link → verify navigation to the linked note.
- Delete a link → verify it is removed.
