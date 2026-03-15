---
description: Narrative Subway Map (Thread Tracker)
---
# Narrative Subway Map (Thread Tracker)

This feature allows authors to visualize multiple narrative streams (threads) and their convergence through the book chapters.

## Backend Implementation
1. **AI Classification Service**: 
   - Create a service in `backend/src/services/threads.ts` to analyze chapters.
   - For each chapter, the AI should identify which "Group" or "Thread" the scene belongs to based on the characters present.
   - Output: `[{ chapterId: number, threadName: string, intensity: number }]`.
2. **Thread API**:
   - `GET /api/books/:id/threads`: Returns the calculated thread map for the book.

## Frontend Implementation
1. **Subway Map Component**:
   - Create `ChapterSubwayMap.tsx` using SVG or a library like `react-xarrows` or `d3`.
   - X-axis: Chapters (ordered).
   - Y-axis: Different Thread Names.
   - Lines: Connect nodes of the same thread.
   - Convergence: If Group A and Group B are in the same chapter, their lines should converge to a single node.
2. **Interactive Stations**:
   - Each node (station) is clickable and navigates to the `NoteEditorPage` for that chapter.
   - Tooltips should show the characters present and a brief scene summary.

## Verification
- Run a test book through the engine.
- Verify that threads merging in the story merge visually in the SVG.
