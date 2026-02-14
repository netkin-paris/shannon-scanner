import type { ScanListItem } from '../types.ts';

interface ScanListProps {
  scans: ScanListItem[];
  onSelect: (workflowId: string) => void;
}

export function ScanList({ scans, onSelect }: ScanListProps) {
  if (scans.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🛡</div>
        <h2>No scans yet</h2>
        <p>Start a new scan to begin security analysis.</p>
      </div>
    );
  }

  return (
    <div className="scan-list">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Scan ID</th>
            <th>Started</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((scan) => (
            <tr
              key={scan.workflowId}
              className="scan-row"
              onClick={() => onSelect(scan.workflowId)}
            >
              <td>
                <StatusBadge status={scan.status} />
              </td>
              <td className="scan-id">{scan.workflowId}</td>
              <td className="scan-time">
                {scan.startTime ? formatTime(scan.startTime) : '—'}
              </td>
              <td className="scan-time">
                {formatDuration(scan.startTime, scan.closeTime)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return '—';
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  const seconds = Math.floor((endMs - startMs) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
