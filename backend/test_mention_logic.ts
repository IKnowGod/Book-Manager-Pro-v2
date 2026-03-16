import { PrismaClient } from '@prisma/client';
// We'll test the logic by mocking the behavior or calling the functions if possible.
// Since isNoteMentioned is not exported, we can't test it directly unless we export it or test it via suggestLinks.
// For verification, I'll temporarily export it or just test via the suggestLinks API.

// I'll create a script that uses the Prisma client to seed a character and then calls the deterministic part of the logic (or just checks if the mention is found).

import { suggestLinks } from './src/services/ai.js';

const prisma = new PrismaClient();

async function testMentionLogic() {
  console.log('--- STARTING MENTION LOGIC TEST ---');
  
  const book = await prisma.book.create({ data: { title: 'Mention Test Book' } });
  
  const savannah = await prisma.note.create({
    data: {
      bookId: book.id,
      type: 'character',
      title: 'Savannah Parker',
      content: 'Mission Specialist.'
    }
  });

  const demitri = await prisma.note.create({
    data: {
      bookId: book.id,
      type: 'character',
      title: 'Commander Demitri Kovalenko',
      content: 'Ship Commander.'
    }
  });

  const chapter = await prisma.note.create({
    data: {
      bookId: book.id,
      type: 'chapter',
      title: 'Chapter 1',
      content: 'Savannah was looking at the stars while Demitri gave orders.'
    }
  });

  console.log('> Seeding complete. Running suggestLinks...');
  
  const suggestions = await suggestLinks(chapter.id, prisma);
  
  console.log('Suggestions found:', suggestions.length);
  suggestions.forEach(s => {
    console.log(`- Related to: ${s.targetTitle} (${s.targetType}) | Reason: ${s.reason}`);
  });

  const hasSavannah = suggestions.some(s => s.targetTitle === 'Savannah Parker');
  const hasDemitri = suggestions.some(s => s.targetTitle === 'Commander Demitri Kovalenko');

  if (hasSavannah && hasDemitri) {
    console.log('\n✅ SUCCESS: Both "Savannah" and "Demitri" partial matches triggered the "Savannah Parker" and "Commander Demitri Kovalenko" links.');
  } else {
    console.log('\n❌ FAILURE: Missing partial matches.');
    if (!hasSavannah) console.error('Missing Savannah Parker');
    if (!hasDemitri) console.error('Missing Commander Demitri Kovalenko');
  }

  // Cleanup
  await prisma.book.delete({ where: { id: book.id } });
}

testMentionLogic()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
