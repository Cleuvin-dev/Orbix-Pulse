import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import type { CurrentUser as CurrentUserType } from "../../application/auth/resolve-current-user.service";

// Só retorna dado válido em rotas protegidas por SupabaseAuthGuard, que popula
// request.currentUser antes do controller rodar.
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentUserType => {
  const request = context.switchToHttp().getRequest<Request>();
  return request.currentUser;
});
