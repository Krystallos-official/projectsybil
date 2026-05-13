import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GraphPage from './Graph';
import RiskPage from './Risk';
import TimelinePage from './Timeline';
import CommunitiesPage from './Communities';
import ReportsPage from './Reports';
import SettingsPage from './Settings';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<GraphPage />} />
      <Route path="/risk" element={<RiskPage />} />
      <Route path="/timeline" element={<TimelinePage />} />
      <Route path="/communities" element={<CommunitiesPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
