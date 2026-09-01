import {
  Badge,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@orbix/ui";
import { Plus } from "lucide-react";

import { MOCK_SUPPLIERS } from "./mock-suppliers";

export default function ComprasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Compras</h1>
        <p className="text-sm text-muted-foreground">
          Fornecedores, pedidos de compra e entrada de NF — dados de demonstração.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">Fornecedores</h2>
        <Button disabled title="Cadastro real chega na Fase 5/12 do roadmap (módulo Compras)">
          <Plus className="h-4 w-4" />
          Novo fornecedor
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_SUPPLIERS.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {supplier.document}
                </TableCell>
                <TableCell className="text-muted-foreground">{supplier.email}</TableCell>
                <TableCell className="text-muted-foreground">{supplier.phone}</TableCell>
                <TableCell>
                  <Badge variant={supplier.isActive ? "outline" : "secondary"}>
                    {supplier.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Pedidos de compra</h2>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Pedidos de compra e entrada de NF ainda não têm modelo de dados definido em{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/03-modelo-dados.md</code>.
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Essa é uma lacuna real do blueprint, não só uma tela pendente — precisa ser desenhada
              (nova entidade de banco) antes de virar funcionalidade, conforme{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">CLAUDE.md</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
