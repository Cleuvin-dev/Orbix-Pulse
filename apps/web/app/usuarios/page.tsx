"use client";

import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@orbix/ui";
import { ROLES, type Role } from "@orbix/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Minus } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { listUsers, updateUserRole } from "@/lib/api/users";
import { ROLE_LABELS } from "@/lib/role-labels";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  SUSPENDED: "Suspenso",
};

// Subconjunto da matriz de permissões de docs/05-permissoes-rbac.md (5.4) — a
// tabela completa fica em role_permissions no backend (Fase 3 do roadmap).
const PERMISSION_MATRIX: { key: string; label: string; roles: Partial<Record<Role, "yes" | "policy">> }[] = [
  { key: "sales.create", label: "Criar venda", roles: { OWNER: "yes", ADMIN: "yes", MANAGER: "yes", CASHIER: "yes", SELLER: "yes" } },
  { key: "sales.cancel", label: "Cancelar venda", roles: { OWNER: "yes", ADMIN: "yes", MANAGER: "policy" } },
  { key: "products.update", label: "Editar produto", roles: { OWNER: "yes", ADMIN: "yes", MANAGER: "yes" } },
  { key: "stock.adjust", label: "Ajustar estoque", roles: { OWNER: "yes", ADMIN: "yes", MANAGER: "yes", STOCK: "yes" } },
  { key: "finance.view_profit", label: "Ver lucro", roles: { OWNER: "yes", ADMIN: "yes", MANAGER: "yes", FINANCE: "yes" } },
  { key: "fiscal.issue", label: "Emitir documento fiscal", roles: { OWNER: "yes", ADMIN: "yes", MANAGER: "yes" } },
  { key: "users.manage", label: "Gerenciar usuários", roles: { OWNER: "yes", ADMIN: "yes" } },
  { key: "audit.view", label: "Ver auditoria", roles: { OWNER: "yes", ADMIN: "yes" } },
];

export default function UsuariosPage() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => updateUserRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const users = usersQuery.data ?? [];
  const errorMessage =
    usersQuery.error instanceof ApiError ? usersQuery.error.message : "Erro ao carregar usuários.";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Usuários e Permissões</h1>
        <p className="text-sm text-muted-foreground">Usuários reais do tenant e o papel de cada um.</p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {usersQuery.isError ? (
          <p className="p-4 text-sm text-destructive">{errorMessage}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    {user.role === "OWNER" ? (
                      <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
                    ) : (
                      <select
                        className="flex h-8 rounded-md border border-input bg-background px-2 text-sm"
                        value={user.role}
                        disabled={updateRoleMutation.isPending}
                        onChange={(e) =>
                          updateRoleMutation.mutate({ id: user.id, role: e.target.value as Role })
                        }
                      >
                        {ROLES.filter((role) => role !== "OWNER").map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{STATUS_LABELS[user.status] ?? user.status}</TableCell>
                </TableRow>
              ))}
              {!usersQuery.isLoading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Matriz de permissões (resumo)</h2>
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permissão</TableHead>
                {ROLES.map((role) => (
                  <TableHead key={role} className="text-center">
                    {ROLE_LABELS[role]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_MATRIX.map((permission) => (
                <TableRow key={permission.key}>
                  <TableCell className="font-medium">{permission.label}</TableCell>
                  {ROLES.map((role) => {
                    const value = permission.roles[role];
                    return (
                      <TableCell key={role} className="text-center">
                        {value === "yes" && <Check className="mx-auto h-4 w-4 text-pulse-online" />}
                        {value === "policy" && (
                          <span className="text-xs text-muted-foreground">política*</span>
                        )}
                        {!value && <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          * configurável por tenant (ex: gerente pode cancelar até X horas após a venda).
        </p>
      </div>
    </div>
  );
}
