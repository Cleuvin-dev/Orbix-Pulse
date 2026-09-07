import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import type { UpdateUserRoleInput } from "@orbix/validation";
import { updateUserRoleSchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { UsersService } from "../../application/users/users.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

@Controller("users")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission("users.manage")
  list(@CurrentUser() user: CurrentUserType) {
    return this.users.list(user.tenantId);
  }

  @Patch(":id/role")
  @RequirePermission("users.manage")
  updateRole(
    @CurrentUser() user: CurrentUserType,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserRoleSchema)) body: UpdateUserRoleInput,
  ) {
    return this.users.updateRole(user.tenantId, user.id, id, body.role);
  }
}
