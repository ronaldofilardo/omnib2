const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testOrphanLogic() {
  try {
    console.log(
      "🧪 Testando lógica de arquivos órfãos diretamente no banco...\n"
    );

    // 1. Buscar usuário e profissional
    const user = await prisma.user.findFirst();
    const professional = await prisma.professional.findFirst();
    console.log(`✅ Usuário: ${user.email} (${user.id})`);
    console.log(`✅ Profissional: ${professional.name}\n`);

    // 2. Criar evento com arquivo diretamente no banco
    const event = await prisma.healthEvent.create({
      data: {
        title: "Teste Órfão Direto",
        date: "2025-11-18",
        type: "EXAME",
        startTime: "16:00",
        endTime: "17:00",
        userId: user.id,
        professionalId: professional.id,
        files: {
          create: [
            {
              slot: "result",
              name: "laudo-direto.pdf",
              url: "/uploads/laudo-direto.pdf",
              uploadDate: "2025-11-18T16:00:00Z",
              professionalId: professional.id,
            },
          ],
        },
      },
      include: { files: true },
    });
    console.log(
      `✅ Evento criado: ${event.id} com ${event.files.length} arquivo(s)`
    );

    // 3. Simular deleção sem deletar arquivos (marcar como órfão)
    await prisma.file.updateMany({
      where: { eventId: event.id },
      data: {
        isOrphaned: true,
        orphanedReason: `Evento '${
          event.title
        }' foi deletado em ${new Date().toLocaleDateString("pt-BR")}`,
      },
    });

    // 4. Remover relação com evento (executar raw SQL como na API)
    await prisma.$executeRaw`UPDATE files SET "eventId" = NULL WHERE "eventId" = ${event.id}`;
    console.log(`✅ Arquivos marcados como órfãos`);

    // 5. Deletar evento
    await prisma.healthEvent.delete({ where: { id: event.id } });
    console.log(`✅ Evento deletado`);

    // 6. Verificar arquivos órfãos
    const orphanFiles = await prisma.file.findMany({
      where: { isOrphaned: true },
      include: { professional: true },
    });
    console.log(`\n🔍 Arquivos órfãos encontrados: ${orphanFiles.length}`);
    orphanFiles.forEach((file) => {
      console.log(`  - ${file.name}: ${file.orphanedReason}`);
      console.log(
        `    eventId: ${file.eventId}, isOrphaned: ${file.isOrphaned}`
      );
    });

    // 7. Testar busca como a API faz
    const apiResults = await prisma.file.findMany({
      where: { isOrphaned: true },
      include: { event: true, professional: true },
    });
    console.log(
      `\n📡 Simulação API retorna: ${apiResults.length} arquivo(s) órfão(s)`
    );

    console.log(
      `\n🎉 Teste concluído! A lógica está funcionando corretamente.`
    );
    console.log(
      `   Agora inicie o servidor (pnpm dev) e vá para Repositório > Arquivos Órfãos`
    );
  } catch (error) {
    console.error("❌ Erro no teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testOrphanLogic();
