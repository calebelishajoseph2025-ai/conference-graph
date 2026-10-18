export function cumulativeByHop(
  byHop: Record<string | number, number> | undefined | null,
  maxHops: number = 3
): number[] {
  if (!byHop) return Array(maxHops).fill(0);
  const result: number[] = [];
  let sum = 0;
  for (let h = 1; h <= maxHops; h++) {
    const count = Number(byHop[h] ?? byHop[String(h)] ?? 0) || 0;
    sum += count;
    result.push(sum);
  }
  return result;
}
