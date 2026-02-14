import { useState, useEffect, useCallback } from 'react';
import { fetchScans } from './api.ts';
import { ScanList } from './components/ScanList.tsx';
import { ScanDetail } from './components/ScanDetail.tsx';
import { NewScanDialog } from './components/NewScanDialog.tsx';
import type { ScanListItem } from './types.ts';

export function App() {
  const [scans, setScans] = useState<ScanListItem[]>([]);
  const [selectedScan, setSelectedScan] = useState<string | null>(null);
  const [showNewScan, setShowNewScan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScans = useCallback(async () => {
    try {
      const data = await fetchScans();
      setScans(data);
      setError(null);
    } catch {
      setError('Failed to connect to Shannon API');
    }
  }, []);

  useEffect(() => {
    loadScans();
    const interval = setInterval(loadScans, 5000);
    return () => clearInterval(interval);
  }, [loadScans]);

  function handleScanStarted(workflowId: string) {
    setShowNewScan(false);
    setSelectedScan(workflowId);
    loadScans();
  }

  if (selectedScan) {
    return (
      <ScanDetail
        workflowId={selectedScan}
        onBack={() => setSelectedScan(null)}
      />
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">Shannon</h1>
          <span className="subtitle">Security Scanner</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewScan(true)}>
          + New Scan
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <ScanList
        scans={scans}
        onSelect={(id) => setSelectedScan(id)}
      />

      {showNewScan && (
        <NewScanDialog
          onClose={() => setShowNewScan(false)}
          onStarted={handleScanStarted}
        />
      )}
    </div>
  );
}
