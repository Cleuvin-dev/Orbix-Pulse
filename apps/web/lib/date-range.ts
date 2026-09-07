// Ranges de data em formato ISO (yyyy-mm-dd) — o que os inputs <input type="date">
// e os endpoints de relatório (financePeriodQuerySchema) esperam.
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

export function todayRange(): { from: string; to: string } {
  const today = toIsoDate(new Date());
  return { from: today, to: today };
}
