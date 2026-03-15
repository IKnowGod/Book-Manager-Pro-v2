---
description: Character Profile & Personality Audit
---
# Character Profile & Personality Audit

Enhances character notes to include personality context and upgrades AI to audit dialogue/behavior against these traits.

## Database Changes
1. **Update `Note` Model**: Add optional JSON or text fields for:
   - `personalityTraits` (e.g., "Shy", "Aggressive")
   - `vocalPatterns` (e.g., "Southern Drawl", "Uses big words")
   - `backgroundContext` (e.g., "Former soldier")

## Backend Implementation
1. **AI Audit Logic**:
   - Update `checkConsistency` in `backend/src/services/ai.ts`.
   - When analyzing a chapter, fetch the profiles of all characters present.
   - Ask AI: "Does the behavior/dialogue in this chapter match the character's stated personality and vocal patterns?"
   - Flag discrepancies as "Character Consistency" issues.

## Frontend Implementation
1. **Enhanced Character Editor**:
   - Update `NoteEditorPage.tsx` to show these extra fields when `noteType === 'character'`.
   - Add a "Guidance" banner explaining that more context improves the AI audit.
2. **Issue Display**:
   - Distinguish between "Fact Inconsistency" (e.g., wrong eye color) and "Personality Inconsistency" (e.g., shy person being loud) in the `InconsistenciesPage.tsx`.

## Verification
- Create a "Shy" character profile.
- Write a chapter where they are extremely outgoing.
- Trigger the check and verify the AI flags the personality mismatch.
