import { Controller, Get, UseGuards } from "@nestjs/common";

import type { CurrentUser as CurrentUserType } from "../../application/auth/resolve-current-user.service";
import { CurrentUser } from "./current-user.decorator";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

@Controller("auth")
export class AuthController {
  @Get("me")
  @UseGuards(SupabaseAuthGuard)
  me(@CurrentUser() currentUser: CurrentUserType) {
    return currentUser;
  }
}
