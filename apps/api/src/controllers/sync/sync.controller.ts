import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import type { SyncBatchInput } from "@orbix/validation";
import { syncBatchSchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { SyncService } from "../../application/sync/sync.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";

// Sem PermissionGuard na rota: permissão é checada por operação dentro do
// lote (docs/09-api.md, 9.5 — uma operação sem permissão não derruba as
// outras), não pela rota inteira como nos demais controllers.
@Controller("sync")
@UseGuards(SupabaseAuthGuard)
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post("batch")
  async batch(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(syncBatchSchema)) body: SyncBatchInput,
  ) {
    const results = await this.sync.processBatch(user, body);
    return { results };
  }

  @Get("status")
  status(@CurrentUser() user: CurrentUserType, @Query("deviceId") deviceId?: string) {
    return this.sync.status(user.tenantId, deviceId);
  }
}
