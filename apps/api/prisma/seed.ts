import { PrismaClient, Role } from "@prisma/client";

import { DEFAULT_ROLE_PERMISSIONS } from "../src/application/permissions/default-role-permissions";

const prisma = new PrismaClient();

const ROLES: Role[] = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "FINANCE",
  "CASHIER",
  "STOCK",
  "SELLER",
  "ACCOUNTANT",
];

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Empresa Teste",
      document: "00000000000191",
      plan: "profissional",
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      tenantId: tenant.id,
      name: "Loja Matriz",
      address: "Rua de Teste, 123",
    },
  });

  for (const role of ROLES) {
    const email = `${role.toLowerCase()}@orbixpulse.dev`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `Usuário ${role}`,
        // placeholder até a integração real com Supabase Auth (Fase 2)
        authId: crypto.randomUUID(),
      },
    });

    await prisma.userRole.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { role },
      create: { userId: user.id, tenantId: tenant.id, role },
    });
  }

  for (const role of ROLES) {
    for (const permission of DEFAULT_ROLE_PERMISSIONS[role]) {
      await prisma.rolePermission.upsert({
        where: { tenantId_role_permission: { tenantId: tenant.id, role, permission } },
        update: { granted: true },
        create: { tenantId: tenant.id, role, permission, granted: true },
      });
    }
  }

  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: "owner@orbixpulse.dev" },
  });

  await prisma.device.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      tenantId: tenant.id,
      branchId: branch.id,
      userId: owner.id,
      name: "PC-CAIXA-01",
    },
  });

  const permissionCount = ROLES.reduce((sum, role) => sum + DEFAULT_ROLE_PERMISSIONS[role].length, 0);
  console.log(
    `Seed concluído: tenant "${tenant.name}", 1 filial, 1 device, ${ROLES.length} usuários, ${permissionCount} role_permissions.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
