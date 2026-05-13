export function nodeSize(fragilityScore: number): number {
  return 4 + (fragilityScore || 0) / 12;
}

export function edgeSize(weight: number): number {
  return Math.log((weight || 1) + 1) * 0.8;
}
