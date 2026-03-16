---
description: Advanced Editor: Rich Text & Markdown Preview
---
# Advanced Editor: Rich Text & Markdown Preview

Move beyond the simple text area to provide a professional authoring experience with formatting and live visualization.

## 1. Frontend: Rich Text Integration
- **Dependency**: `react-markdown` and `remark-gfm` for rendering, or a library like `TipTap` / `Quill` for the editor itself.
- **Implementation**:
    - Update `NoteEditorPage.tsx`:
        - Replace standard `<textarea>` with a split-view or toggle-view editor.
        - **Left Side**: Editor (Markdown).
        - **Right Side**: Live Preview (Rendered HTML).
    - Add toolbar for common formatting: **Bold**, *Italic*, # Headings, [Links].

## 2. Smart Formatting Features
- **Auto-Capitalization**: Ensure sentence starts are capitalized.
- **Smart Quotes**: Automatically convert standard quotes to "Curly Quotes".
- **Scene Breakers**: Quick shortcut (e.g., `***` or `---`) for visual scene separators.

## 3. Keyboard Shortcuts
- `Ctrl+S`: Save (Override default browser behavior).
- `Ctrl+B`: Bold.
- `Ctrl+I`: Italic.

## Verification
- Type Markdown syntax in the editor and verify the preview updates in real-time.
- Use keyboard shortcuts and verify they apply formatting correctly.
- Save a complex note and verify it renders perfectly when reopened.
