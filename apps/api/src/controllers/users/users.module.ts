import { Module } from "@nestjs/common";

import { UsersService } from "../../application/users/users.service";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { UsersController } from "./users.controller";

@Module({
  imports: [AuthModule, PermissionsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
