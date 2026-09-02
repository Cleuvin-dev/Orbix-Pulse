import { Controller, Get, INestApplication, UseGuards } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { CurrentUser } from "@orbix/types";
import request from "supertest";
import { afterAll, beforeAll, describe, it, vi } from "vitest";

import { ResolveCurrentUserService } from "../../application/auth/resolve-current-user.service";
import { CanPerformService } from "../../application/permissions/can-perform.service";
import { SupabaseService } from "../../infrastructure/auth/supabase.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "./permission.guard";
import { RequirePermission } from "./require-permission.decorator";

const cashierUser: CurrentUser = {
  id: "user-1",
  email: "cashier@orbixpulse.dev",
  name: "Usuário CASHIER",
  tenantId: "tenant-1",
  tenantName: "Empresa Teste",
  role: "CASHIER",
};

@Controller("test")
class TestController {
  @Get("finance/dre")
  @UseGuards(SupabaseAuthGuard, PermissionGuard)
  @RequirePermission("finance.view_profit")
  dre() {
    return { ok: true };
  }

  @Get("sales")
  @UseGuards(SupabaseAuthGuard, PermissionGuard)
  @RequirePermission("sales.create")
  createSale() {
    return { ok: true };
  }
}

// Teste de integração de API (docs/10-testes.md, 10.2) reproduzindo o caso
// exato do blueprint (10.3): "Given: usuário com role CASHIER, When: GET
// /finance/dre, Then: 403". Passa pelo pipeline real de guards do Nest
// (SupabaseAuthGuard -> PermissionGuard), só troca a verificação externa do
// Supabase e o acesso ao banco por mocks.
describe("Pipeline de auth + permissão via HTTP (docs/10-testes.md, 10.3)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        SupabaseAuthGuard,
        PermissionGuard,
        {
          provide: SupabaseService,
          useValue: { verifyToken: vi.fn().mockResolvedValue({ id: "auth-1", email: cashierUser.email }) },
        },
        { provide: ResolveCurrentUserService, useValue: { resolve: vi.fn().mockResolvedValue(cashierUser) } },
        {
          provide: CanPerformService,
          useValue: { check: vi.fn((_user, permission: string) => Promise.resolve(permission === "sales.create")) },
        },
        { provide: PrismaService, useValue: { auditLog: { create: vi.fn() } } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("CASHIER autenticado, sem permissão finance.view_profit -> 403", async () => {
    await request(app.getHttpServer())
      .get("/test/finance/dre")
      .set("Authorization", "Bearer token-valido")
      .expect(403);
  });

  it("CASHIER autenticado, com permissão sales.create -> 200", async () => {
    await request(app.getHttpServer())
      .get("/test/sales")
      .set("Authorization", "Bearer token-valido")
      .expect(200, { ok: true });
  });

  it("sem token -> 401 antes mesmo de checar permissão", async () => {
    await request(app.getHttpServer()).get("/test/sales").expect(401);
  });
});
