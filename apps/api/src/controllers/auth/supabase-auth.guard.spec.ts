import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolveCurrentUserService } from "../../application/auth/resolve-current-user.service";
import type { SupabaseService } from "../../infrastructure/auth/supabase.service";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

function buildContext(headers: Record<string, string | string[] | undefined>): ExecutionContext {
  const request: Record<string, unknown> = { headers };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe("SupabaseAuthGuard", () => {
  let verifyToken: ReturnType<typeof vi.fn>;
  let resolve: ReturnType<typeof vi.fn>;
  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    verifyToken = vi.fn();
    resolve = vi.fn();
    const supabase = { verifyToken } as unknown as SupabaseService;
    const resolveCurrentUser = { resolve } as unknown as ResolveCurrentUserService;
    guard = new SupabaseAuthGuard(supabase, resolveCurrentUser);
  });

  it("rejeita quando não há header Authorization", async () => {
    const context = buildContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("rejeita header Authorization sem prefixo Bearer", async () => {
    const context = buildContext({ authorization: "token-sem-bearer" });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejeita quando o Supabase não reconhece o token", async () => {
    verifyToken.mockResolvedValue(null);
    const context = buildContext({ authorization: "Bearer token-invalido" });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("resolve o usuário e popula request.currentUser em token válido", async () => {
    verifyToken.mockResolvedValue({ id: "auth-1", email: "owner@orbixpulse.dev" });
    const currentUser = { id: "user-1", email: "owner@orbixpulse.dev", name: "x", tenantId: "t1", role: "OWNER" };
    resolve.mockResolvedValue(currentUser);

    const request: Record<string, unknown> = {
      headers: { authorization: "Bearer token-valido", "x-tenant-id": "t1" },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(resolve).toHaveBeenCalledWith({ id: "auth-1", email: "owner@orbixpulse.dev" }, "t1");
    expect(request.currentUser).toEqual(currentUser);
  });
});
