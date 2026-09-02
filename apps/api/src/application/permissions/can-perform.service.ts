import { Injectable } from "@nestjs/common";
import type { CurrentUser } from "@orbix/types";

import { PrismaService } from "../../infrastructure/database/prisma.service";

// CanPerform(user, permission) → boolean (docs/05-permissoes-rbac.md, 5.5).
// Precedência: override por usuário > permissão do role > nega por padrão
// (fail-closed — uma permissão não seedada/desconhecida nunca é concedida).
@Injectable()
export class CanPerformService {
  constructor(private readonly prisma: PrismaService) {}

  async check(user: CurrentUser, permission: string): Promise<boolean> {
    const override = await this.prisma.userPermissionOverride.findUnique({
      where: {
        tenantId_userId_permission: {
          tenantId: user.tenantId,
          userId: user.id,
          permission,
        },
      },
    });
    if (override && !override.deletedAt) {
      return override.granted;
    }

    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        tenantId_role_permission: {
          tenantId: user.tenantId,
          role: user.role,
          permission,
        },
      },
    });
    if (rolePermission && !rolePermission.deletedAt) {
      return rolePermission.granted;
    }

    return false;
  }
}
