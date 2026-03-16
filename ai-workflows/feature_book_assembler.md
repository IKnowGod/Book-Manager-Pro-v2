---
description: Book Assembler & Export Manager
---
# Book Assembler & Export Manager

Features for stitching chapters together, calculating manuscript stats, and exporting the final work.

## Backend Implementation
1. **Assembly Logic**:
   - Create a service in `backend/src/services/export.ts` to concatenate note contents based on a provided order.
   - Support for "Front Matter" (Dedication, Preface) identified by type or specific tags.
2. **Stats Calculation**:
   - Calculate total word count.
   - Calculate "Manuscript Pages" using 275 words per page as the standard.
3. **Export API**:
   - `POST /api/books/:id/export`: Generates a downloadable file (Markdown, TXT, or PDF via simple formatting).

## Frontend Implementation
1. **Assembler Page**:
   - Create `BookAssemblerPage.tsx`.
   - Use `react-beautiful-dnd` to allow re-ordering of chapters.
   - Selection list for including/excluding specific detail notes as "Front Matter".
2. **Live Counter**:
   - Show a persistent "Manuscript Stats" card on the assembly page.
3. **Export Dialog**:
   - Modal to choose format and download the result.
4. **UI Refinement**:
   - Enhanced spacing, padding, and layout for a premium feel.
   - Added a clear page description.

## Verification
- Assemble a 3-chapter book.
- Verify the word count matches the sum of the chapters.
- Check that the PDF/Text file contains all chapters in the correct order.
