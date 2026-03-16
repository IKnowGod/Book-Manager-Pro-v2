/**
 * Helper to determine if a note's title is mentioned in content.
 * For characters, it checks for partial name matches (e.g. "Savannah" matches "Savannah Parker").
 */
export function isNoteMentioned(content: string, noteTitle: string, noteType: string): boolean {
  if (!content) return false;
  const contentLower = content.toLowerCase();
  const titleLower = noteTitle.trim().toLowerCase();
  
  if (!titleLower || titleLower.length < 3) return false;

  // 1. Exact Title Match
  if (contentLower.includes(titleLower)) return true;

  // 2. Character-Specific Partial Matching (First/Last names)
  if (noteType === 'character') {
    const parts = titleLower.split(/\s+/).filter(p => p.length >= 3);
    // Skip common titles from being the SOLE trigger
    const commonTitles = ['commander', 'captain', 'doctor', 'professor', 'agent', 'officer', 'member'];
    
    for (const part of parts) {
      if (commonTitles.includes(part)) continue;
      // Check for word boundary to avoid partial matches like "Dan" in "Danger"
      try {
        const regex = new RegExp(`\\b${part}\\b`, 'i');
        if (regex.test(contentLower)) return true;
      } catch (e) {
        // Fallback for messy regex chars
        if (contentLower.includes(part)) return true;
      }
    }
  }

  return false;
}
