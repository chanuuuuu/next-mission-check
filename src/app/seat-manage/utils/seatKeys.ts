// Derive row keys (format: "1F_A_r2") from seat assignment keys for preOccupied set.
export function getOccupiedRowKeys(assignments: Record<string, number>): Set<string> {
  const keys = new Set<string>();
  for (const seatKey of Object.keys(assignments)) {
    const parts = seatKey.split("_"); // ['1F','A','R3','C5']
    const rowIdx = parseInt(parts[2].slice(1)) - 1; // 'R3' → 2
    keys.add(`${parts[0]}_${parts[1]}_r${rowIdx}`);
  }
  return keys;
}
