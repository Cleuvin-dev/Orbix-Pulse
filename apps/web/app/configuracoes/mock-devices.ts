// MOCK — reflete `devices` (docs/03-modelo-dados.md, 3.3).
export interface MockDevice {
  id: string;
  name: string;
  appVersion: string;
  lastSyncAt: string;
  status: "ACTIVE" | "INACTIVE";
}

export const MOCK_DEVICES: MockDevice[] = [
  { id: "1", name: "PC-CAIXA-01", appVersion: "0.1.0", lastSyncAt: "há 2 minutos", status: "ACTIVE" },
  { id: "2", name: "TABLET-ESTOQUE", appVersion: "0.1.0", lastSyncAt: "há 18 minutos", status: "ACTIVE" },
  { id: "3", name: "PC-CAIXA-02", appVersion: "0.0.9", lastSyncAt: "há 3 dias", status: "INACTIVE" },
];
