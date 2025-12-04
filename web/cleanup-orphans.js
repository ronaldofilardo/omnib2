const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanup() {
  try {
    const result = await prisma.file.deleteMany({
      where: { isOrphaned: true },
    });
    console.log(`${result.count} arquivos órfãos removidos`);
  } catch (error) {
    console.error("Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
