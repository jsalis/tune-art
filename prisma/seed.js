const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seed() {
    // use prisma to seed the database here
    console.log("Database has been seeded. 🌱");
}

seed()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
