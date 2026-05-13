import React from 'react';
import { useConnectors } from '../hooks/useConnectors';
import { ConnectorCard } from '../components/connectors/ConnectorCard';

export default function SettingsPage() {
  const { connectors, loading, sync } = useConnectors();

  return (
    <div className="p-6 overflow-y-auto h-full max-w-2xl mx-auto">
      <h1 className="font-display text-2xl text-accent-cyan tracking-wider mb-6">CONNECTORS</h1>
      <div className="space-y-3">
        {loading ? (
          <div className="text-text-muted font-mono text-xs">Loading connectors...</div>
        ) : (
          connectors.map(c => (
            <ConnectorCard key={c.name} connector={c} onSync={() => sync(c.name)} />
          ))
        )}
      </div>
    </div>
  );
}
