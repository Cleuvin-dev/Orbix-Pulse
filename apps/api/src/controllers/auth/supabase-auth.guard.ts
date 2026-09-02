import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { ResolveCurrentUserService } from "../../application/auth/resolve-current-user.service";
import { SupabaseService } from "../../infrastructure/auth/supabase.service";

// Middleware de Auth (docs/09-api.md, 9.3): valida o JWT do Supabase e resolve
// tenant_id/role a partir do banco antes do controller ser executado.
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly resolveCurrentUser: ResolveCurrentUserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!token) {
      throw new UnauthorizedException("Token ausente.");
    }

    const authUser = await this.supabase.verifyToken(token);
    if (!authUser) {
      throw new UnauthorizedException("Token inválido ou expirado.");
    }

    const requestedTenantId = request.headers["x-tenant-id"];
    const tenantIdHeader = Array.isArray(requestedTenantId) ? requestedTenantId[0] : requestedTenantId;

    request.currentUser = await this.resolveCurrentUser.resolve(authUser, tenantIdHeader);
    return true;
  }
}
