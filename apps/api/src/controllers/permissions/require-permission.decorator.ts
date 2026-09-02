import { SetMetadata } from "@nestjs/common";

export const PERMISSION_METADATA_KEY = "requiredPermission";

// Toda rota de negócio declara a permissão necessária (docs/09-api.md, 9.3).
// Usar sempre depois de SupabaseAuthGuard: @UseGuards(SupabaseAuthGuard, PermissionGuard).
export const RequirePermission = (permission: string) => SetMetadata(PERMISSION_METADATA_KEY, permission);
