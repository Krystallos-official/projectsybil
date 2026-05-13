export const RISK_COLORS = {
  critical: '#ff1a3c',
  high: '#ff6b00',
  medium: '#ffd600',
  low: '#00e676',
} as const;

export const RISK_GLOW = {
  critical: 'rgba(255,26,60,0.3)',
  high: 'rgba(255,107,0,0.2)',
  medium: 'rgba(255,214,0,0.15)',
  low: 'rgba(0,230,118,0.1)',
} as const;

export function colorByRiskTier(tier: string): string {
  return RISK_COLORS[tier as keyof typeof RISK_COLORS] || RISK_COLORS.low;
}

// 10-color qualitative palette for community visualization
export const COMMUNITY_COLORS = [
  '#2979ff', '#00e5ff', '#7c4dff', '#ff1a3c', '#00e676',
  '#ff6b00', '#ffd600', '#e040fb', '#1de9b6', '#ff5252',
];

export function colorByCommunity(communityId: number): string {
  return COMMUNITY_COLORS[communityId % COMMUNITY_COLORS.length];
}
