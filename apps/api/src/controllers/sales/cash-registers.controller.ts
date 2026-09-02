import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { CloseCashRegisterInput, OpenCashRegisterInput } from "@orbix/validation";
import { closeCashRegisterSchema, openCashRegisterSchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { CashRegistersService } from "../../application/sales/cash-registers.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

@Controller("cash-registers")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class CashRegistersController {
  constructor(private readonly cashRegisters: CashRegistersService) {}

  @Get("current")
  @RequirePermission("cash_register.open_close")
  current(@CurrentUser() user: CurrentUserType) {
    return this.cashRegisters.current(user.tenantId, user.id);
  }

  @Post("open")
  @RequirePermission("cash_register.open_close")
  open(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(openCashRegisterSchema)) body: OpenCashRegisterInput,
  ) {
    return this.cashRegisters.open(user.tenantId, user.id, body);
  }

  @Post(":id/close")
  @RequirePermission("cash_register.open_close")
  close(
    @CurrentUser() user: CurrentUserType,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(closeCashRegisterSchema)) body: CloseCashRegisterInput,
  ) {
    return this.cashRegisters.close(user.tenantId, user.id, id, body);
  }
}
