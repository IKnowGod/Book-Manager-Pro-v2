# Feature: Advanced Author Analysis Suite

This suite adds deep narrative analysis tools to help authors understand their book's rhythm, get constructive feedback, and identify plot holes.

## 1. Narrative Pacing & Intensity
- **Goal**: Visualize the "heartbeat" of the story.
- **Implementation**:
    - Backend: `analyzePacing` helper in `ai.ts` calculating scores from text density and dialogue.
    - Frontend: `Pacing` tab in `AnalysisPage.tsx` using an Area Chart.
- **Workflow**:
    1. Open a Book.
    2. Click **Analysis** in the sidebar.
    3. Select the **Pacing** tab to see chapter-by-chapter intensity.

## 2. AI Beta-Reader Persona
- **Goal**: Provide simulated reader feedback on individual chapters.
- **Implementation**:
    - Backend: `getBetaReaderFeedback` in `ai.ts` using a "Beta Reader" persona prompt.
    - Frontend: **Request Beta Feedback** button in `NoteEditorPage.tsx`.
- **Workflow**:
    1. Open or create a Chapter note.
    2. Click the 📖 icon or "Request Feedback" button.
    3. Review the AI's perspective on clarity and engagement.

## 3. Loose End Scanner
- **Goal**: Identify unresolved story threads.
- **Implementation**:
    - Backend: `scanForLooseEnds` in `ai.ts` to find mentioned mysteries without resolution.
    - Frontend: `Plot Holes` tab in `AnalysisPage.tsx`.
- **Workflow**:
    1. Click **Analysis** in the sidebar.
    2. Select the **Plot Holes** tab to scan your entire book for unresolved threads.
