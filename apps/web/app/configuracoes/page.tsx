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

import { MOCK_DEVICES } from "./mock-devices";

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Empresa, dispositivos e integrações — dados de demonstração.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Razão social</label>
            <Input defaultValue="Empresa Teste" disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">CNPJ</label>
            <Input defaultValue="00.000.000/0001-91" disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Plano</label>
            <Input defaultValue="Profissional" disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Filial principal</label>
            <Input defaultValue="Loja Matriz" disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Integração fiscal
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Provedor</label>
            <Input defaultValue="Focus NFe" disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Regime tributário</label>
            <Input defaultValue="Simples Nacional" disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Documento padrão (venda de balcão)</label>
            <Input defaultValue="NFC-e" disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Certificado digital</label>
            <Input defaultValue="Não configurado" disabled />
          </div>
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
              {MOCK_DEVICES.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell className="text-muted-foreground">{device.appVersion}</TableCell>
                  <TableCell className="text-muted-foreground">{device.lastSyncAt}</TableCell>
                  <TableCell>
                    <Badge variant={device.status === "ACTIVE" ? "outline" : "secondary"}>
                      {device.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Button disabled className="self-start" title="Configuração real chega nas Fases 2 e 10 do roadmap">
        Salvar alterações
      </Button>
    </div>
  );
}
