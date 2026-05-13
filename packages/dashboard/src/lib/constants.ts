export const APP_NAME = '◈ SYBIL';
export const APP_VERSION = '1.0.0';

export const NAV_ITEMS = [
  { path: '/', label: 'Graph', icon: 'network' },
  { path: '/risk', label: 'Risk Register', icon: 'alert-triangle' },
  { path: '/timeline', label: 'Timeline', icon: 'clock' },
  { path: '/communities', label: 'Communities', icon: 'users' },
  { path: '/reports', label: 'Reports', icon: 'file-text' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
] as const;

export const RISK_TIERS = ['critical', 'high', 'medium', 'low'] as const;
