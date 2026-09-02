import {
  db,
  type LocalCashRegister,
  type LocalPayment,
  type LocalProduct,
  type LocalSale,
  type LocalSaleItem,
  type LocalStockMovement,
} from "@/lib/db";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Sincronização seletiva por permissão (docs/06-offline-first.md, 6.4): o
// dispositivo não pede "me dá tudo" — chama cada endpoint normalmente, e
// quem decide o que o usuário pode ver é o backend (RBAC da Fase 3), não uma
// lista de permissões duplicada aqui (CLAUDE.md regra 1: nada de regra de
// negócio crítica no frontend). 403 num endpoint = essa entidade simplesmente
// não entra no banco local, silenciosamente — não é um erro de hidratação.
async function fetchJson<T>(path: string, accessToken: string): Promise<T | null> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

interface PaginatedResponse<T> {
  items: T[];
}

interface SaleResponse extends LocalSale {
  items: LocalSaleItem[];
  payments: LocalPayment[];
}

// Só as entidades que já têm endpoint de leitura no backend (Fases 4-7).
// customers/suppliers ficam com a tabela local vazia até existir CRUD pra
// elas (não modeladas em nenhuma fase ainda) — documentado, não esquecido.
export async function hydrateLocalDatabase(accessToken: string): Promise<void> {
  const [products, sales, stockMovements, cashRegister] = await Promise.all([
    fetchJson<PaginatedResponse<LocalProduct>>("/v1/products?pageSize=100", accessToken),
    fetchJson<PaginatedResponse<SaleResponse>>("/v1/sales?pageSize=100", accessToken),
    fetchJson<PaginatedResponse<LocalStockMovement>>("/v1/stock/movements?pageSize=100", accessToken),
    fetchJson<LocalCashRegister | null>("/v1/cash-registers/current", accessToken),
  ]);

  await db.transaction(
    "rw",
    [db.products, db.sales, db.saleItems, db.payments, db.stockMovements, db.cashRegisters, db.appMetadata],
    async () => {
      if (products) {
        await db.products.clear();
        await db.products.bulkPut(products.items);
      }

      if (sales) {
        await db.sales.clear();
        await db.saleItems.clear();
        await db.payments.clear();
        await db.sales.bulkPut(sales.items.map(({ items: _items, payments: _payments, ...sale }) => sale));
        await db.saleItems.bulkPut(sales.items.flatMap((sale) => sale.items));
        await db.payments.bulkPut(sales.items.flatMap((sale) => sale.payments));
      }

      if (stockMovements) {
        await db.stockMovements.clear();
        await db.stockMovements.bulkPut(stockMovements.items);
      }

      await db.cashRegisters.clear();
      if (cashRegister) {
        await db.cashRegisters.put(cashRegister);
      }

      await db.appMetadata.put({ key: "lastSyncedAt", value: new Date().toISOString() });
    },
  );
}
