"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@orbix/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { listDevices } from "@/lib/api/devices";
import { getCurrentTenant, updateTenantSettings, type Tenant } from "@/lib/api/tenants";

// Componente próprio pra ler o estado inicial do checkbox/input direto dos
// props (useState com inicializador, sem useEffect) — se isso fosse feito no
// componente pai com useEffect sincronizando depois que `tenant` chega, uma
// interação do usuário bem no meio do primeiro carregamento seria sobrescrita
// pelo efeito assim que a query resolvesse (bug real, pego com Playwright).
function OperationalSettingsForm({ tenant, onSave, saving }: { tenant: Tenant; onSave: (input: { allowNegativeStock: boolean; saleCancelWindowHours?: number }) => void; saving: boolean }) {
  const [allowNegativeStock, setAllowNegativeStock] = useState(tenant.settings.allowNegativeStock ?? false);
  const [saleCancelWindowHours, setSaleCancelWindowHours] = useState(
    String(tenant.settings.saleCancelWindowHours ?? ""),
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSave({
      allowNegativeStock,
      saleCancelWindowHours: saleCancelWindowHours === "" ? undefined : Number(saleCancelWindowHours),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <input
          id="allow-negative-stock"
          type="checkbox"
          checked={allowNegativeStock}
          onChange={(e) => setAllowNegativeStock(e.target.checked)}
        />
        <label htmlFor="allow-negative-stock" className="text-sm">
          Permitir estoque negativo (docs/04-regras-negocio.md, 4.2)
        </label>
      </div>
      <div className="flex max-w-xs flex-col gap-1.5">
        <label htmlFor="cancel-window" className="text-xs font-medium text-muted-foreground">
          Janela para gerente cancelar venda (horas)
        </label>
        <Input
          id="cancel-window"
          type="number"
          min="0"
          step="1"
          value={saleCancelWindowHours}
          onChange={(e) => setSaleCancelWindowHours(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Vazio = MANAGER não pode cancelar (docs/05-permissoes-rbac.md, 5.5).
        </p>
      </div>
      <Button type="submit" className="self-start" disabled={saving}>
        {saving ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();

  const tenantQuery = useQuery({ queryKey: ["tenant-me"], queryFn: getCurrentTenant });
  const devicesQuery = useQuery({
    queryKey: ["devices", "all"],
    queryFn: () => listDevices({ includeInactive: true }),
  });

  const settingsMutation = useMutation({
    mutationFn: updateTenantSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-me"] }),
  });

  const tenant = tenantQuery.data;
  const devices = devicesQuery.data ?? [];
  const tenantErrorMessage =
    tenantQuery.error instanceof ApiError ? tenantQuery.error.message : "Erro ao carregar dados da empresa.";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Empresa, regras operacionais e dispositivos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tenantQuery.isError ? (
            <p className="text-sm text-destructive sm:col-span-2">{tenantErrorMessage}</p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Razão social</label>
                <Input value={tenant?.name ?? ""} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">CNPJ</label>
                <Input value={tenant?.document ?? ""} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Plano</label>
                <Input value={tenant?.plan ?? ""} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Status</label>
                <Input value={tenant?.status ?? ""} disabled />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Configurações operacionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenant ? (
            <OperationalSettingsForm
              tenant={tenant}
              saving={settingsMutation.isPending}
              onSave={(input) => settingsMutation.mutate(input)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">Integração fiscal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aguardando a escolha do provedor fiscal (Fase 10 do roadmap — Focus NFe, eNotas, Tecnospeed ou
            NFe.io). Configuração fica disponível assim que a fase for implementada.
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium">Dispositivos registrados</h2>
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Versão do app</TableHead>
                <TableHead>Última sincronização</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell className="text-muted-foreground">{device.appVersion ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString("pt-BR") : "Nunca"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={device.status === "ACTIVE" ? "outline" : "secondary"}>
                      {device.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!devicesQuery.isLoading && devices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum dispositivo registrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
