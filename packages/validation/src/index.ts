import { BARCODE_TYPES } from "@orbix/types";
import { z } from "zod";

// Tudo num arquivo só de propósito: um import relativo (ex: "./barcode") sem
// extensão quebra em runtime no apps/api (nest start), porque o Node detecta
// sintaxe ESM (export ... from) no arquivo e usa o resolvedor estrito, que
// exige extensão de arquivo — mesmo sem "type": "module" no package.json.
// packages/types não sofre disso porque só é importado com `import type`
// (apagado em tempo de compilação, nunca vira um require() de verdade).

export const createBarcodeSchema = z.object({
  code: z.string().trim().min(1).max(64),
  type: z.enum(BARCODE_TYPES),
});
export type CreateBarcodeInput = z.infer<typeof createBarcodeSchema>;

export const createProductCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  parentId: z.string().uuid().nullish(),
});
export const updateProductCategorySchema = createProductCategorySchema.partial();
export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;

// docs/03-modelo-dados.md (3.3, "products"). current_stock nunca aparece aqui:
// é cache recalculável a partir de stock_movements, nunca editável diretamente
// (fonte de verdade chega na Fase 5 — docs/04-regras-negocio.md, 4.4).
export const createProductSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  categoryId: z.string().uuid().nullish(),
  unit: z.string().trim().min(1).max(16),
  // centavos, nunca float (CLAUDE.md regra 9).
  costPrice: z.number().int().nonnegative(),
  salePrice: z.number().int().nonnegative(),
  minimumStock: z.number().nonnegative().nullish(),
  maximumStock: z.number().nonnegative().nullish(),
  supplierId: z.string().uuid().nullish(),
  isActive: z.boolean().optional(),
});
export const updateProductSchema = createProductSchema.partial();
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
