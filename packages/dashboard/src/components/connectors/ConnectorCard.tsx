import React from 'react';
import { Card } from '../ui/Card';
import type { ConnectorStatus } from '../../types/api';

export function ConnectorCard({ connector, onSync }: { connector: ConnectorStatus; onSync: () => void }) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${connector.configured ? 'bg-risk-low' : 'bg-text-muted'}`} />
          <span className="font-mono text-sm text-text-primary font-semibold">{connector.name}</span>
        </div>
        <div className="font-mono text-[10px] text-text-muted">
          {connector.configured ? 'Connected' : 'Not configured'}
        </div>
      </div>
      <button onClick={onSync} disabled={!connector.configured}
        className="px-3 py-1.5 bg-accent-blue/10 border border-accent-blue/30 rounded text-accent-blue font-mono text-xs hover:bg-accent-blue/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        Sync Now
      </button>
    </Card>
  );
}
