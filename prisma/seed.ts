import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  // Create a test user
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: 'password', // Plain text as per PRD requirements
    },
  });

  console.log('Created user:', user);

  // Load transcript data
  const transcriptsPath = path.join(process.cwd(), 'public', 'voice_transcript.json');
  const transcriptsData = JSON.parse(fs.readFileSync(transcriptsPath, 'utf-8'));

  // Create transcripts
  for (const transcript of transcriptsData) {
    await prisma.transcript.upsert({
      where: { 
        // Using title as unique identifier for upsert
        title: transcript.title 
      },
      update: {
        content: transcript.content,
      },
      create: {
        title: transcript.title,
        content: transcript.content,
      },
    });
  }

  console.log(`Seeded ${transcriptsData.length} transcripts`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });