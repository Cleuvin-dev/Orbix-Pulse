// Valores monetários trafegam sempre em centavos (docs/03-modelo-dados.md, 3.1).
export function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Inverso: formulário edita em reais (UX), API sempre recebe centavos.
export function reaisInputToCents(value: string): number {
  const reais = Number(value.replace(",", "."));
  return Number.isFinite(reais) ? Math.round(reais * 100) : 0;
}
