import type { ScanListItem, ScanProgress } from './types.ts';

const BASE = '/api';

export async function fetchScans(): Promise<ScanListItem[]> {
  const res = await fetch(`${BASE}/scans`);
  if (!res.ok) throw new Error('Failed to fetch scans');
  return res.json();
}

export async function fetchScanProgress(id: string): Promise<ScanProgress> {
  const res = await fetch(`${BASE}/scans/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to fetch scan progress');
  return res.json();
}

export async function startScan(url: string, repo: string): Promise<{ workflowId: string }> {
  const res = await fetch(`${BASE}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, repo }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to start scan');
  }
  return res.json();
}

export async function fetchRepos(): Promise<string[]> {
  const res = await fetch(`${BASE}/repos`);
  if (!res.ok) throw new Error('Failed to fetch repos');
  return res.json();
}
