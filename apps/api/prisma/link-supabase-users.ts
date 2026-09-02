// Script de dev only: cria no Supabase Auth um usuário para cada usuário já
// seedado (prisma/seed.ts) e vincula o auth_id retornado em users.auth_id.
// Não faz parte do `prisma db seed` porque depende de rede/serviço externo —
// roda manualmente, uma vez, contra o projeto Supabase configurado no .env.
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const DEV_PASSWORD = "OrbixDev123!";

async function main() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("SUPABASE_URL/SUPABASE_SECRET_KEY não configurados no .env.");
  }

  const prisma = new PrismaClient();
  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const users = await prisma.user.findMany({ where: { deletedAt: null } });
  const { data: existing } = await supabase.auth.admin.listUsers();

  for (const user of users) {
    const existingAuthUser = existing?.users.find((candidate) => candidate.email === user.email);

    const authId =
      existingAuthUser?.id ??
      (
        await supabase.auth.admin.createUser({
          email: user.email,
          password: DEV_PASSWORD,
          email_confirm: true,
        })
      ).data.user?.id;

    if (!authId) {
      console.error(`Falha ao criar/encontrar usuário Supabase para ${user.email}`);
      continue;
    }

    await prisma.user.update({ where: { id: user.id }, data: { authId } });
    console.log(`Vinculado: ${user.email} -> auth_id ${authId}`);
  }

  await prisma.$disconnect();
  console.log(`\nSenha de dev para todos os usuários: ${DEV_PASSWORD}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
