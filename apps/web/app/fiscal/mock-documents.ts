import type { FiscalDocumentStatus, FiscalDocumentType } from "@orbix/types";

// MOCK — reflete `fiscal_documents` (docs/03-modelo-dados.md, 3.3 / docs/08-fiscal.md).
// Emissão real via provedor terceirizado é Fase 10 do roadmap.
export interface MockFiscalDocument {
  id: string;
  saleRef: string;
  type: FiscalDocumentType;
  status: FiscalDocumentStatus;
  provider: string;
  amountCents: number;
  issuedAt: string;
}

export const MOCK_FISCAL_DOCUMENTS: MockFiscalDocument[] = [
  {
    id: "1",
    saleRef: "Venda #1042",
    type: "NFCE",
    status: "AUTHORIZED",
    provider: "Focus NFe",
    amountCents: 3888,
    issuedAt: "hoje, 14:33",
  },
  {
    id: "2",
    saleRef: "Venda #1041",
    type: "NFCE",
    status: "AUTHORIZED",
    provider: "Focus NFe",
    amountCents: 999,
    issuedAt: "hoje, 14:11",
  },
  {
    id: "3",
    saleRef: "Venda #1040",
    type: "NFCE",
    status: "PROCESSING",
    provider: "Focus NFe",
    amountCents: 5990,
    issuedAt: "hoje, 13:52",
  },
  {
    id: "4",
    saleRef: "Venda #1038",
    type: "NFE",
    status: "REJECTED",
    provider: "Focus NFe",
    amountCents: 45900,
    issuedAt: "ontem, 17:20",
  },
  {
    id: "5",
    saleRef: "Venda #1021",
    type: "NFCE",
    status: "PENDING",
    provider: "—",
    amountCents: 12900,
    issuedAt: "aguardando sincronização",
  },
];

export const FISCAL_STATUS_LABELS: Record<FiscalDocumentStatus, string> = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  AUTHORIZED: "Autorizada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};
