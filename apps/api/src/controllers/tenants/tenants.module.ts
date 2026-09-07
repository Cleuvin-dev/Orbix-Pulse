import { Module } from "@nestjs/common";

import { TenantsService } from "../../application/tenants/tenants.service";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { TenantsController } from "./tenants.controller";

@Module({
  imports: [AuthModule, PermissionsModule],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
