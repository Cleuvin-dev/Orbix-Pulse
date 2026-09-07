import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { DevicesService } from "../../application/branches/devices.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

// Mesma lacuna de branches.controller.ts: sem permissão dedicada, e sem fluxo
// de pareamento de device ainda (docs/06-offline-first.md não define isso —
// só existe o device seedado manualmente por tenant, Fase 1). Frontend usa
// esta lista pra escolher um device ativo até existir um fluxo de
// registro/pareamento de verdade.
@Controller("devices")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  @RequirePermission("products.view")
  list(@CurrentUser() user: CurrentUserType, @Query("includeInactive") includeInactive?: string) {
    return this.devices.list(user.tenantId, includeInactive === "true");
  }
}
