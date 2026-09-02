import { Module } from "@nestjs/common";

import { BranchesService } from "../../application/branches/branches.service";
import { DevicesService } from "../../application/branches/devices.service";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { BranchesController } from "./branches.controller";
import { DevicesController } from "./devices.controller";

@Module({
  imports: [AuthModule, PermissionsModule],
  controllers: [BranchesController, DevicesController],
  providers: [BranchesService, DevicesService],
})
export class BranchesModule {}
