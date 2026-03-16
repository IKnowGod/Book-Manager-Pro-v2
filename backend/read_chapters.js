import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const chapters = await prisma.note.findMany({
    where: { type: 'chapter' }
  });
  
  for (const ch of chapters) {
    console.log(`=== ID: ${ch.id} | TITLE: ${ch.title} ===`);
    console.log(ch.content);
    console.log('\n----------------------------------------\n');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
