// Valores monetários trafegam sempre em centavos (docs/03-modelo-dados.md, 3.1).
export function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
