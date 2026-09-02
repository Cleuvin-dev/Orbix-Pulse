import { Module } from "@nestjs/common";

import { CanPerformService } from "../../application/permissions/can-perform.service";
import { PermissionGuard } from "./permission.guard";

@Module({
  providers: [CanPerformService, PermissionGuard],
  exports: [CanPerformService, PermissionGuard],
})
export class PermissionsModule {}
