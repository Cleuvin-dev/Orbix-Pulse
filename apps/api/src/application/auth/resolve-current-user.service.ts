import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import type { CurrentUser } from "@orbix/types";

import { PrismaService } from "../../infrastructure/database/prisma.service";
import type { SupabaseAuthUser } from "../../infrastructure/auth/supabase.service";

export type { CurrentUser } from "@orbix/types";

// Middleware de resolução de tenant_id a partir do usuário autenticado
// (docs/02-arquitetura.md, 2.6 e docs/09-api.md, 9.2): nunca confia em tenant_id
// vindo do cliente sem checar contra o vínculo real do usuário no banco.
@Injectable()
export class ResolveCurrentUserService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(authUser: SupabaseAuthUser, requestedTenantId?: string): Promise<CurrentUser> {
    // Vínculo por auth_id apenas — nunca por e-mail. Vincular por e-mail em tempo de
    // requisição seria explorável: se o self-signup do Supabase estiver habilitado,
    // qualquer um poderia criar uma conta com o e-mail de um usuário existente e
    // herdar a identidade dele. O vínculo é feito fora desse fluxo (script de
    // provisionamento / futura tela de convite na Fase 3).
    const user = await this.prisma.user.findUnique({
      where: { authId: authUser.id },
      include: {
        roles: {
          where: { deletedAt: null },
          include: { tenant: true },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new ForbiddenException("Usuário sem vínculo de autenticação no Orbix Pulse.");
    }
    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("Usuário inativo.");
    }

    const activeRoles = user.roles.filter(
      (userRole) => userRole.tenant.status === "ACTIVE" && !userRole.tenant.deletedAt,
    );

    let selected: (typeof activeRoles)[number];
    if (requestedTenantId) {
      const match = activeRoles.find((userRole) => userRole.tenantId === requestedTenantId);
      if (!match) {
        throw new ForbiddenException("Usuário sem acesso a este tenant.");
      }
      selected = match;
    } else if (activeRoles.length === 0) {
      throw new ForbiddenException("Usuário sem tenant ativo vinculado.");
    } else if (activeRoles.length > 1) {
      throw new BadRequestException(
        "Usuário vinculado a múltiplos tenants — informe o header X-Tenant-Id.",
      );
    } else {
      // length === 1 aqui: os outros dois casos (0 e >1) já foram tratados acima.
      selected = activeRoles[0]!;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: selected.tenantId,
      tenantName: selected.tenant.name,
      role: selected.role,
    };
  }
}
