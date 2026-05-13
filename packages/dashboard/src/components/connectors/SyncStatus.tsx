import React from 'react';
export function SyncStatus({ status }: { status: string }) {
  return <span className="font-mono text-[10px] text-accent-cyan">{status}</span>;
}
