import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import type { UpdateTenantSettingsInput } from "@orbix/validation";
import { updateTenantSettingsSchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { TenantsService } from "../../application/tenants/tenants.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

@Controller("tenants")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get("me")
  @RequirePermission("settings.manage")
  me(@CurrentUser() user: CurrentUserType) {
    return this.tenants.findOrThrow(user.tenantId);
  }

  @Patch("me/settings")
  @RequirePermission("settings.manage")
  updateSettings(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(updateTenantSettingsSchema)) body: UpdateTenantSettingsInput,
  ) {
    return this.tenants.updateSettings(user.tenantId, body);
  }
}
