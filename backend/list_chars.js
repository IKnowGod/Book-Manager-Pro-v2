import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const notes = await prisma.note.findMany({
    where: { type: 'character' },
    select: { title: true }
  });
  console.log(JSON.stringify(notes, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
