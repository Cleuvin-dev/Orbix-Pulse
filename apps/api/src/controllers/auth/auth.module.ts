import { Module } from "@nestjs/common";

import { ResolveCurrentUserService } from "../../application/auth/resolve-current-user.service";
import { AuthController } from "./auth.controller";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

@Module({
  controllers: [AuthController],
  providers: [ResolveCurrentUserService, SupabaseAuthGuard],
  exports: [ResolveCurrentUserService, SupabaseAuthGuard],
})
export class AuthModule {}
