function isNoteMentioned(content: string, noteTitle: string, noteType: string): boolean {
  const contentLower = content.toLowerCase();
  const titleLower = noteTitle.trim().toLowerCase();
  
  if (!titleLower || titleLower.length < 3) return false;

  // 1. Exact Title Match
  if (contentLower.includes(titleLower)) return true;

  // 2. Character-Specific Partial Matching (First/Last names)
  if (noteType === 'character') {
    const parts = titleLower.split(/\s+/).filter(p => p.length >= 3);
    // Skip common titles from being the SOLE trigger
    const commonTitles = ['commander', 'captain', 'doctor', 'professor', 'agent', 'officer'];
    
    for (const part of parts) {
      if (commonTitles.includes(part)) continue;
      // Check for word boundary to avoid partial matches like "Dan" in "Danger"
      const regex = new RegExp(`\\b${part}\\b`, 'i');
      if (regex.test(contentLower)) return true;
    }
  }

  return false;
}

const tests = [
  { content: 'Savannah was here', title: 'Savannah Parker', type: 'character', expected: true },
  { content: 'Parker said hello', title: 'Savannah Parker', type: 'character', expected: true },
  { content: 'Demitri gave orders', title: 'Commander Demitri Kovalenko', type: 'character', expected: true },
  { content: 'The commander spoke', title: 'Commander Demitri Kovalenko', type: 'character', expected: false },
  { content: 'Dana is a CPA', title: 'Dana Li', type: 'character', expected: true },
  { content: 'Li is short', title: 'Dana Li', type: 'character', expected: false }, // "Li" is < 3 chars
  { content: 'Danger zone', title: 'Dan Miller', type: 'character', expected: false }, // Word boundary test
  { content: 'Exact match', title: 'Exact Match', type: 'detail', expected: true }
];

console.log('--- TESTING MENTION LOGIC ---');
let passCount = 0;
tests.forEach((t, i) => {
  const result = isNoteMentioned(t.content, t.title, t.type);
  const status = result === t.expected ? '✅ PASS' : '❌ FAIL';
  if (result === t.expected) passCount++;
  console.log(`${status} [Test ${i+1}] "${t.content}" matched against "${t.title}" (${t.type}) -> expected ${t.expected}, got ${result}`);
});

console.log(`\nTOTAL: ${passCount}/${tests.length} PASSED`);
if (passCount === tests.length) {
  process.exit(0);
} else {
  process.exit(1);
}
