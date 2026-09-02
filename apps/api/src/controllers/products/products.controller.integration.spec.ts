import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { CurrentUser } from "@orbix/types";
import request from "supertest";
import { afterAll, beforeAll, describe, it, vi } from "vitest";

import { ResolveCurrentUserService } from "../../application/auth/resolve-current-user.service";
import { CanPerformService } from "../../application/permissions/can-perform.service";
import { ProductCategoriesService } from "../../application/products/product-categories.service";
import { ProductsService } from "../../application/products/products.service";
import { SupabaseService } from "../../infrastructure/auth/supabase.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { ProductCategoriesController } from "./product-categories.controller";
import { ProductsController } from "./products.controller";

// Primeira rota de negócio real usando o pipeline SupabaseAuthGuard ->
// PermissionGuard (a infra da Fase 3 ficou pronta sem nenhum consumidor real
// até aqui — docs/12-roadmap-fases.md). CanPerformService concede/nega de
// acordo com a matriz de verdade (docs/05-permissoes-rbac.md, 5.4): SELLER não
// tem products.update, CASHIER tem products.view.
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

describe("ProductsController — pipeline de auth + RBAC numa rota real", () => {
  let app: INestApplication;
  let currentRole: CurrentUser["role"] = "CASHIER";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController, ProductCategoriesController],
      providers: [
        ProductsService,
        ProductCategoriesService,
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
          // Reflete a matriz real (docs/05-permissoes-rbac.md, 5.4): SELLER só
          // tem sales.create/products.view; CASHIER tem products.view.
          provide: CanPerformService,
          useValue: {
            check: vi.fn((user: CurrentUser, permission: string) => {
              const granted: Record<string, string[]> = {
                SELLER: ["sales.create", "products.view"],
                CASHIER: ["sales.create", "products.view", "cash_register.open_close"],
                MANAGER: ["products.view", "products.update"],
              };
              return Promise.resolve((granted[user.role] ?? []).includes(permission));
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            product: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
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

  it("CASHIER (tem products.view) -> GET /products -> 200", async () => {
    currentRole = "CASHIER";
    await request(app.getHttpServer())
      .get("/products")
      .set("Authorization", "Bearer token-valido")
      .expect(200);
  });

  it("SELLER (não tem products.update) -> POST /products -> 403", async () => {
    currentRole = "SELLER";
    await request(app.getHttpServer())
      .post("/products")
      .set("Authorization", "Bearer token-valido")
      .send({ sku: "SKU-1", name: "Produto", unit: "un", costPrice: 100, salePrice: 200 })
      .expect(403);
  });

  it("sem token -> 401", async () => {
    await request(app.getHttpServer()).get("/products").expect(401);
  });

  it("payload inválido (sem campos obrigatórios) -> 400, mesmo com permissão concedida", async () => {
    currentRole = "MANAGER"; // MANAGER tem products.update — a rejeição aqui é só de validação de formato
    await request(app.getHttpServer())
      .post("/products")
      .set("Authorization", "Bearer token-valido")
      .send({ sku: "" })
      .expect(400);
  });
});
