import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { CanPerformService } from "../../application/permissions/can-perform.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { PERMISSION_METADATA_KEY } from "./require-permission.decorator";

// Middleware de Authorization (docs/09-api.md, 9.3): roda depois do
// SupabaseAuthGuard, que já deixou request.currentUser resolvido.
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly canPerform: CanPerformService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<string | undefined>(PERMISSION_METADATA_KEY, context.getHandler());
    if (!permission) {
      // Rota sem @RequirePermission: nada a checar aqui (não é o guard que
      // decide se autenticação é necessária — isso é papel do SupabaseAuthGuard).
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const currentUser = request.currentUser;

    const allowed = await this.canPerform.check(currentUser, permission);
    if (!allowed) {
      // Tentativa negada registrada em audit_log (docs/09-api.md, 9.3). Não há
      // uma entidade de negócio específica sendo acessada aqui (a "ação negada"
      // é a permissão em si), então usamos o próprio usuário como entity/entityId.
      await this.prisma.auditLog.create({
        data: {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "PERMISSION_DENIED",
          entity: "user",
          entityId: currentUser.id,
          after: { permission, path: request.path, method: request.method },
        },
      });
      throw new ForbiddenException(`Sem permissão: ${permission}.`);
    }

    return true;
  }
}
