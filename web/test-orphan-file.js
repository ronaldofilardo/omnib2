const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1. Buscar usuário e profissional
  const user = await prisma.user.findFirst();
  const professional = await prisma.professional.findFirst();
  if (!user || !professional)
    throw new Error("Usuário ou profissional não encontrado");

  // 2. Criar evento com arquivo
  const event = await prisma.healthEvent.create({
    data: {
      title: "Evento Órfão",
      date: "2025-11-18",
      type: "EXAME",
      startTime: "15:00",
      endTime: "16:00",
      userId: user.id,
      professionalId: professional.id,
      files: {
        create: [
          {
            slot: "exam",
            name: "arquivo-orfao.pdf",
            url: "/uploads/arquivo-orfao.pdf",
            uploadDate: "2025-11-18T15:00:00Z",
          },
        ],
      },
    },
    include: { files: true },
  });
  console.log("Evento criado:", event.id);
  const fileId = event.files[0].id;

  // 3. Deletar evento sem deletar arquivos
  await prisma.file.update({
    where: { id: fileId },
    data: { isOrphaned: false, orphanedReason: null, eventId: event.id },
  }); // garantir estado inicial
  await fetch("http://localhost:3000/api/events", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: event.id, deleteFiles: false }),
  });

  // 4. Verificar arquivo órfão
  const orphanFile = await prisma.file.findUnique({ where: { id: fileId } });
  if (orphanFile && orphanFile.isOrphaned && orphanFile.eventId === null) {
    console.log("✅ Arquivo marcado como órfão:", orphanFile);
  } else {
    console.error("❌ Arquivo não está órfão:", orphanFile);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
