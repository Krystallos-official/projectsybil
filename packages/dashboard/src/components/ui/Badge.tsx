import React from 'react';
import { colorByRiskTier } from '../../lib/colorScale';

export function Badge({ tier, className = '' }: { tier: string; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${className}`}
      style={{ color: colorByRiskTier(tier), borderColor: colorByRiskTier(tier) + '66', background: colorByRiskTier(tier) + '1a' }}>
      {tier}
    </span>
  );
}
