// MOCK — reflete os campos de `products` em docs/03-modelo-dados.md (3.3).
// CRUD real e paginação chegam na Fase 4 (docs/12-roadmap-fases.md).
export interface MockProduct {
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPriceCents: number;
  salePriceCents: number;
  currentStock: number;
  minimumStock: number;
  isActive: boolean;
}

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    sku: "REF-2L-001",
    name: "Refrigerante 2L",
    category: "Bebidas",
    unit: "UN",
    costPriceCents: 650,
    salePriceCents: 999,
    currentStock: 84,
    minimumStock: 20,
    isActive: true,
  },
  {
    sku: "PAO-FR-KG",
    name: "Pão francês",
    category: "Padaria",
    unit: "KG",
    costPriceCents: 890,
    salePriceCents: 1490,
    currentStock: 32,
    minimumStock: 10,
    isActive: true,
  },
  {
    sku: "CAFE-500",
    name: "Café 500g",
    category: "Mercearia",
    unit: "UN",
    costPriceCents: 1290,
    salePriceCents: 1890,
    currentStock: 56,
    minimumStock: 15,
    isActive: true,
  },
  {
    sku: "OLEO-SOJA-900",
    name: "Óleo de soja 900ml",
    category: "Mercearia",
    unit: "UN",
    costPriceCents: 720,
    salePriceCents: 999,
    currentStock: 3,
    minimumStock: 10,
    isActive: true,
  },
  {
    sku: "DET-500",
    name: "Detergente 500ml",
    category: "Limpeza",
    unit: "UN",
    costPriceCents: 210,
    salePriceCents: 349,
    currentStock: 5,
    minimumStock: 15,
    isActive: true,
  },
  {
    sku: "ARROZ-5KG",
    name: "Arroz 5kg",
    category: "Mercearia",
    unit: "UN",
    costPriceCents: 2190,
    salePriceCents: 2990,
    currentStock: 8,
    minimumStock: 20,
    isActive: true,
  },
  {
    sku: "AGUA-500",
    name: "Água mineral 500ml",
    category: "Bebidas",
    unit: "UN",
    costPriceCents: 150,
    salePriceCents: 299,
    currentStock: 120,
    minimumStock: 30,
    isActive: true,
  },
  {
    sku: "BISC-REC-200",
    name: "Biscoito recheado 200g",
    category: "Mercearia",
    unit: "UN",
    costPriceCents: 340,
    salePriceCents: 599,
    currentStock: 0,
    minimumStock: 12,
    isActive: false,
  },
];
