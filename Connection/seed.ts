import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

  // Check if companies exist
  const count = await prisma.company.count();

  if (count === 0) {
    console.log("🏗 No companies found. Creating default: Self Hiring");

    await prisma.company.create({
      data: {
        name: "Self Hiring"
      }
    });

    console.log("✅ Default company added");
  } else {
    console.log("🚀 Company table already seeded — skipping.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
