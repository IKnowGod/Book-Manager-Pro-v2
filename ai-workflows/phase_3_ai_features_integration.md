# Phase 3: AI Feature Integration (Gemini)

## Objective
Port the AI-powered consistency checking and tag suggestion logic from Python to the Node.js backend.

## Tasks

### 3.1. Gemini SDK Integration
- Configure `@google/generative-ai` in the backend.
- Set up secure environment variable management for the API Key.

### 3.2. Consistency Check Service
- Port the "Continuity Editor" prompt logic.
- Implement logic to fetch historical context for a note before sending it to the AI.
- Store results in the `Inconsistency` table.

### 3.3. Tag Suggestion Service
- Port the "Librarian/Archivist" prompt logic.
- Implement endpoints to suggest existing tags and new tags for a given note.

## Deliverables
- AI-powered persistence and suggestion features active.
- Integrated UI feedback for inconsistencies (e.g., highlighting problem text).
