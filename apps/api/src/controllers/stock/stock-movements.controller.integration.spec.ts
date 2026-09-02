import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { CurrentUser } from "@orbix/types";
import request from "supertest";
import { afterAll, beforeAll, describe, it, vi } from "vitest";

import { ResolveCurrentUserService } from "../../application/auth/resolve-current-user.service";
import { CanPerformService } from "../../application/permissions/can-perform.service";
import { StockMovementsService } from "../../application/stock/stock-movements.service";
import { SupabaseService } from "../../infrastructure/auth/supabase.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { StockMovementsController } from "./stock-movements.controller";

function buildUser(role: CurrentUser["role"]): CurrentUser {
  return {
    id: "user-1",
    email: `${role.toLowerCase()}@orbixpulse.dev`,
    name: `Usuário ${role}`,
    tenantId: "tenant-1",
    tenantName: "Empresa Teste",
    role,
  };
}

// Reflete docs/05-permissoes-rbac.md (5.4): stock.movement.create/stock.adjust
// só para OWNER/ADMIN/MANAGER/STOCK — CASHIER e SELLER não têm.
const GRANTED: Record<string, string[]> = {
  STOCK: ["products.view", "stock.movement.create", "stock.adjust"],
  CASHIER: ["products.view", "sales.create", "cash_register.open_close"],
};

describe("StockMovementsController — pipeline de auth + RBAC", () => {
  let app: INestApplication;
  let currentRole: CurrentUser["role"] = "STOCK";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StockMovementsController],
      providers: [
        StockMovementsService,
        SupabaseAuthGuard,
        PermissionGuard,
        {
          provide: SupabaseService,
          useValue: { verifyToken: vi.fn().mockResolvedValue({ id: "auth-1", email: "user@orbixpulse.dev" }) },
        },
        {
          provide: ResolveCurrentUserService,
          useValue: { resolve: vi.fn().mockImplementation(() => Promise.resolve(buildUser(currentRole))) },
        },
        {
          provide: CanPerformService,
          useValue: {
            check: vi.fn((user: CurrentUser, permission: string) =>
              Promise.resolve((GRANTED[user.role] ?? []).includes(permission)),
            ),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            stockMovement: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
            auditLog: { create: vi.fn() },
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("STOCK (tem stock.movement.create) -> POST /stock/movements com payload válido chega no service (não é 403)", async () => {
    currentRole = "STOCK";
    const response = await request(app.getHttpServer())
      .post("/stock/movements")
      .set("Authorization", "Bearer token-valido")
      .send({
        operationId: "11111111-1111-1111-1111-111111111111",
        productId: "11111111-1111-1111-1111-111111111112",
        branchId: "11111111-1111-1111-1111-111111111113",
        type: "ENTRADA",
        quantity: 5,
        reason: "Compra recebida",
      });
    // 500 é esperado aqui (PrismaService mockado não tem product/branch) — o
    // que importa é que NÃO foi barrado em 401/403/400 antes de chegar no service.
    if (response.status === 401 || response.status === 403 || response.status === 400) {
      throw new Error(`Esperado passar do guard/validação, recebeu ${response.status}: ${response.text}`);
    }
  });

  it("CASHIER (sem stock.movement.create) -> POST /stock/movements -> 403", async () => {
    currentRole = "CASHIER";
    await request(app.getHttpServer())
      .post("/stock/movements")
      .set("Authorization", "Bearer token-valido")
      .send({
        operationId: "22222222-2222-2222-2222-222222222221",
        productId: "22222222-2222-2222-2222-222222222222",
        branchId: "22222222-2222-2222-2222-222222222223",
        type: "ENTRADA",
        quantity: 5,
        reason: "Compra recebida",
      })
      .expect(403);
  });

  it("CASHIER (sem stock.adjust) -> POST /stock/reconciliation -> 403", async () => {
    currentRole = "CASHIER";
    await request(app.getHttpServer())
      .post("/stock/reconciliation")
      .set("Authorization", "Bearer token-valido")
      .send({
        operationId: "33333333-3333-3333-3333-333333333331",
        productId: "33333333-3333-3333-3333-333333333332",
        branchId: "33333333-3333-3333-3333-333333333333",
        countedQuantity: 7,
        reason: "Inventário",
      })
      .expect(403);
  });

  it("sem token -> GET /stock/alerts -> 401", async () => {
    await request(app.getHttpServer()).get("/stock/alerts").expect(401);
  });
});
