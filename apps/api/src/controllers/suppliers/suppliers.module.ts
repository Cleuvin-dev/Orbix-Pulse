import { Module } from "@nestjs/common";

import { SuppliersService } from "../../application/suppliers/suppliers.service";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { SuppliersController } from "./suppliers.controller";

@Module({
  imports: [AuthModule, PermissionsModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
})
export class SuppliersModule {}
