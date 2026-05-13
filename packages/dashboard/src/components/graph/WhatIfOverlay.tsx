import React from 'react';
import { useWhatIf } from '../../hooks/useWhatIf';
import { ProgressBar } from '../ui/ProgressBar';
import { colorByRiskTier } from '../../lib/colorScale';

export function WhatIfOverlay() {
  const { whatIfNode, whatIfResult, whatIfLoading, restoreWhatIf } = useWhatIf();

  if (!whatIfNode) return null;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[380px] z-30 bg-surface/95 backdrop-blur-md border-l border-border shadow-2xl flex flex-col animate-slide-in">
      {/* Header */}
      <div className="border-b border-risk-critical/30 bg-risk-critical/5 p-4">
        <div className="flex items-center gap-2 text-risk-critical font-mono text-sm font-semibold mb-1">
          <span className="text-lg">⚠</span> IMPACT SIMULATION
        </div>
        {whatIfResult && (
          <div className="text-text-primary font-mono text-xs">
            Removing: <span className="text-risk-critical font-semibold">{whatIfResult.removed_node_name}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {whatIfLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-risk-critical font-mono text-sm animate-pulse mb-4">
              SIMULATING IMPACT...
            </div>
            <div className="w-48">
              <ProgressBar value={60} color="#ff1a3c" />
            </div>
          </div>
        ) : whatIfResult ? (
          <div className="space-y-4 font-mono text-xs">
            {/* Impact Score */}
            <div>
              <div className="text-text-muted uppercase text-[10px] tracking-wider mb-2">Impact Score</div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar value={whatIfResult.impact_score} color={whatIfResult.impact_score >= 70 ? '#ff1a3c' : whatIfResult.impact_score >= 40 ? '#ff6b00' : '#ffd600'} />
                </div>
                <span className="text-2xl font-display" style={{ color: whatIfResult.impact_score >= 70 ? '#ff1a3c' : '#ff6b00' }}>
                  {whatIfResult.impact_score}
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Disconnected', value: `${whatIfResult.disconnected_count} nodes`, color: '#ff1a3c' },
                { label: 'Orphaned repos', value: `${whatIfResult.orphaned_repos.length} repos`, color: '#ff6b00' },
                { label: 'Affected projects', value: `${whatIfResult.affected_projects.length} proj`, color: '#ffd600' },
                { label: 'Severed paths', value: `${whatIfResult.severed_paths} paths`, color: '#00e5ff' },
              ].map((stat) => (
                <div key={stat.label} className="bg-elevated border border-border rounded p-3">
                  <div className="text-text-muted text-[10px] uppercase tracking-wider">{stat.label}</div>
                  <div className="text-lg font-display mt-1" style={{ color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Affected Projects List */}
            {whatIfResult.affected_projects.length > 0 && (
              <div>
                <div className="text-text-muted uppercase text-[10px] tracking-wider mb-2">Affected Projects</div>
                <div className="space-y-1">
                  {whatIfResult.affected_projects.slice(0, 8).map((p) => (
                    <div key={p} className="text-text-secondary bg-elevated rounded px-2 py-1 text-[11px]">{p}</div>
                  ))}
                  {whatIfResult.affected_projects.length > 8 && (
                    <div className="text-text-muted text-[10px]">+{whatIfResult.affected_projects.length - 8} more</div>
                  )}
                </div>
              </div>
            )}

            {/* Interpretation */}
            <div className="border-t border-border pt-4">
              <div className="text-text-muted uppercase text-[10px] tracking-wider mb-2">Interpretation</div>
              <div className="text-text-primary leading-relaxed text-[11px] italic">
                "{whatIfResult.interpretation}"
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <button onClick={restoreWhatIf}
          className="w-full py-2 bg-accent-blue/10 border border-accent-blue/30 rounded text-accent-blue font-mono text-xs hover:bg-accent-blue/20 transition-colors">
          RESTORE NODE
        </button>
      </div>
    </div>
  );
}
