import React from 'react';
export function OAuthButton({ provider }: { provider: string }) {
  return (
    <button className="px-4 py-2 bg-elevated border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary transition-colors">
      Connect {provider}
    </button>
  );
}
