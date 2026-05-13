import { useState, useEffect } from 'react';
import * as api from '../lib/api';
import type { ConnectorStatus } from '../types/api';
export function useConnectors() {
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getConnectors().then(d => { setConnectors(d.connectors); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const sync = async (name: string) => { await api.syncConnector(name); };
  return { connectors, loading, sync };
}
