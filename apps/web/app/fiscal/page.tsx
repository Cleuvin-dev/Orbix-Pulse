import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@orbix/ui";
import type { FiscalDocumentStatus } from "@orbix/types";
import { Download, FileText } from "lucide-react";

import { formatCentsToBRL } from "@/lib/format";

import { FISCAL_STATUS_LABELS, MOCK_FISCAL_DOCUMENTS } from "./mock-documents";

const STATUS_BADGE_VARIANT: Record<FiscalDocumentStatus, "outline" | "secondary" | "destructive"> = {
  PENDING: "outline",
  PROCESSING: "outline",
  AUTHORIZED: "secondary",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};

export default function FiscalPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Fiscal</h1>
        <p className="text-sm text-muted-foreground">
          Documentos fiscais emitidos via provedor terceirizado — dados de demonstração
          (docs/08-fiscal.md).
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Venda</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Provedor</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Emitida</TableHead>
              <TableHead className="text-right">Documentos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_FISCAL_DOCUMENTS.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.saleRef}</TableCell>
                <TableCell>{doc.type}</TableCell>
                <TableCell className="text-muted-foreground">{doc.provider}</TableCell>
                <TableCell className="text-right">{formatCentsToBRL(doc.amountCents)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[doc.status]}>
                    {FISCAL_STATUS_LABELS[doc.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{doc.issuedAt}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={doc.status !== "AUTHORIZED"}
                      title="PDF/DANFE — orquestração real chega na Fase 10"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={doc.status !== "AUTHORIZED"}
                      title="XML — orquestração real chega na Fase 10"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
