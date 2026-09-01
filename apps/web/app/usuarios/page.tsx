import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@orbix/ui";
import { ROLES, type Role } from "@orbix/types";
import { Check, Minus } from "lucide-react";

import { MOCK_USERS, ROLE_LABELS } from "@/lib/dev-session";

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
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Usuários e Permissões</h1>
        <p className="text-sm text-muted-foreground">
          Um usuário por papel — dados de demonstração (docs/05-permissoes-rbac.md).
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Filial</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLES.map((role) => {
              const user = MOCK_USERS[role];
              return (
                <TableRow key={role}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABELS[role]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.branchName}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
