import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load env just like the app does
dotenv.config(); 

const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Diagnostic ---');
  console.log('Current Workdir:', process.cwd());
  console.log('DATABASE_URL from Env:', process.env.DATABASE_URL);
  
  try {
    const books = await prisma.book.findMany();
    console.log('Success! Found', books.length, 'books.');
  } catch (error: any) {
    console.error('Prisma Error:', error.message);
    if (error.code === 'P1003') {
      console.log('Suggestion: Database file does not exist at the path Prisma is looking.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
