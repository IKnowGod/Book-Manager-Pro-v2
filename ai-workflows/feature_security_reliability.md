---
description: Security & Reliability: HTML Sanitization & Enhanced Data Validation
---
# Security & Reliability: HTML Sanitization & Enhanced Data Validation

This workflow covers the implementation of safety measures to prevent XSS and ensure database integrity through stricter validation.

## 1. HTML Sanitization (XSS Prevention)

### Backend
1. **Install Dependency**:
   ```bash
   cd backend
   npm install sanitize-html
   npm install --save-dev @types/sanitize-html
   ```
2. **Implementation**:
   - Create a utility in `backend/src/utils/sanitizer.ts`:
     ```typescript
     import sanitizeHtml from 'sanitize-html';

     export const sanitizeContent = (html: string) => {
       return sanitizeHtml(html, {
         allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
         allowedAttributes: {
           ...sanitizeHtml.defaults.allowedAttributes,
           '*': ['style', 'class'],
         },
       });
     };
     ```
   - Update `backend/src/routes/notes.ts`:
     - Sanitize `content` in `POST /books/:bookId/notes` and `PUT /notes/:id` before saving to Prisma.

## 2. Enhanced Data Validation (Prisma & Zod)

### Backend
1. **Schema Refinement**:
   - Update `NoteCreateSchema` and `NoteUpdateSchema` in `backend/src/routes/notes.ts`:
     - `title`: Add `.trim().min(1).max(200)`.
     - `content`: Add `.trim()`.
     - Use `.strict()` to prevent unknown properties.
2. **ID Validation**:
   - Ensure all `parseInt(req.params.id)` calls are wrapped in robust checks or handled by Zod.

## Verification
1. **Automated**:
   - Add a test case in `backend/tests/security.test.ts` that tries to post a note with `<script>alert(1)</script>` and verifies the script is stripped.
2. **Manual**:
   - Create a note with malicious HTML and verify it renders safely in the frontend.
