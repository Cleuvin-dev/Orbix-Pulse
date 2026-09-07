import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Role } from "@prisma/client";

import { PrismaService } from "../../infrastructure/database/prisma.service";

// Usuários do tenant (docs/12-roadmap-fases.md, Fase 2 — "listar os usuários
// reais do tenant via API é trabalho futuro", sinalizado desde então). Não é
// uma fase nova do roadmap, é trabalho pendente já sinalizado numa fase
// concluída — mesmo padrão de Financeiro (Fase 7).
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { tenantId, deletedAt: null, user: { deletedAt: null } },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });

    return userRoles.map((userRole) => ({
      id: userRole.user.id,
      name: userRole.user.name,
      email: userRole.user.email,
      status: userRole.user.status,
      role: userRole.role,
    }));
  }

  // docs/05-permissoes-rbac.md (5.2): "OWNER — acesso total, não
  // removível/limitável". Trocar o role de quem hoje é OWNER fica bloqueado
  // aqui — não existe um fluxo de transferência de propriedade no blueprint,
  // não inventei um agora.
  async updateRole(tenantId: string, actingUserId: string, targetUserId: string, role: Role) {
    const userRole = await this.prisma.userRole.findFirst({
      where: { userId: targetUserId, tenantId, deletedAt: null },
    });
    if (!userRole) throw new NotFoundException("Usuário não encontrado neste tenant.");

    if (userRole.role === "OWNER") {
      throw new ConflictException("O papel de OWNER não pode ser alterado.");
    }
    if (userRole.role === role) return userRole; // idempotente, nada a auditar

    const previousRole = userRole.role;
    const updated = await this.prisma.userRole.update({
      where: { id: userRole.id },
      data: { role },
    });

    // docs/05-permissoes-rbac.md (5.8): "Qualquer alteração de role... é
    // registrada em audit_log, incluindo quem alterou, quando, e o antes/depois."
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actingUserId,
        action: "USER_ROLE_CHANGED",
        entity: "user",
        entityId: targetUserId,
        before: { role: previousRole },
        after: { role },
      },
    });

    return updated;
  }
}
