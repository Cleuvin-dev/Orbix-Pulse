// MOCK — reflete `suppliers` (docs/03-modelo-dados.md, 3.3).
export interface MockSupplier {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  isActive: boolean;
}

export const MOCK_SUPPLIERS: MockSupplier[] = [
  {
    id: "1",
    name: "Distribuidora Boa Vista Bebidas",
    document: "12.345.678/0001-90",
    email: "vendas@boavistabebidas.com.br",
    phone: "(11) 4002-8922",
    isActive: true,
  },
  {
    id: "2",
    name: "Mercearia Atacado Central",
    document: "23.456.789/0001-11",
    email: "comercial@atacadocentral.com.br",
    phone: "(11) 3555-1020",
    isActive: true,
  },
  {
    id: "3",
    name: "Padaria e Insumos São José",
    document: "34.567.890/0001-22",
    email: "contato@insumossaojose.com.br",
    phone: "(11) 2233-4455",
    isActive: true,
  },
  {
    id: "4",
    name: "Limpeza Total Distribuição",
    document: "45.678.901/0001-33",
    email: "atendimento@limpezatotal.com.br",
    phone: "(11) 3344-5566",
    isActive: false,
  },
];
