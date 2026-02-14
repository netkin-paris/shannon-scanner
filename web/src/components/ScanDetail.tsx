import { useState, useEffect, useCallback } from 'react';
import { fetchScanProgress } from '../api.ts';
import type { ScanProgress } from '../types.ts';

interface ScanDetailProps {
  workflowId: string;
  onBack: () => void;
}

const TOTAL_AGENTS = 13;

const PIPELINE_PHASES = [
  { id: 'pre-recon', label: 'Pre-Recon', agents: ['pre-recon'] },
  { id: 'recon', label: 'Recon', agents: ['recon'] },
  {
    id: 'vulnerability-exploitation',
    label: 'Vuln / Exploit',
    agents: [
      'injection-vuln', 'xss-vuln', 'auth-vuln', 'ssrf-vuln', 'authz-vuln',
      'injection-exploit', 'xss-exploit', 'auth-exploit', 'ssrf-exploit', 'authz-exploit',
    ],
  },
  { id: 'reporting', label: 'Reporting', agents: ['report'] },
];

export function ScanDetail({ workflowId, onBack }: ScanDetailProps) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchScanProgress(workflowId);
      setProgress(data);
      setError(null);
    } catch {
      setError('Failed to load scan progress');
    }
  }, [workflowId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  const completedCount = progress?.completedAgents.length ?? 0;
  const pct = Math.round((completedCount / TOTAL_AGENTS) * 100);

  return (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <button className="btn btn-back" onClick={onBack}>&larr; Back</button>
          <h1 className="logo-sm">Scan Detail</h1>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {!progress ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="detail">
          <div className="detail-header-row">
            <div>
              <div className="detail-id">{workflowId}</div>
              <span className={`badge badge-${progress.status}`}>
                {progress.status}
              </span>
            </div>
            <div className="detail-meta">
              <span>Elapsed: {formatDuration(progress.elapsedMs)}</span>
              {progress.summary && (
                <>
                  <span>Cost: ${progress.summary.totalCostUsd.toFixed(2)}</span>
                  <span>Turns: {progress.summary.totalTurns}</span>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-section">
            <div className="progress-label">
              {completedCount} / {TOTAL_AGENTS} agents &mdash; {pct}%
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill progress-fill-${progress.status}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Current activity */}
          {progress.currentAgent && progress.status === 'running' && (
            <div className="current-activity">
              <span className="pulse" />
              Running: <strong>{progress.currentAgent}</strong>
              {progress.currentPhase && (
                <span className="phase-tag">{progress.currentPhase}</span>
              )}
            </div>
          )}

          {/* Error */}
          {progress.error && (
            <div className="error-box">
              <strong>Error:</strong> {progress.error}
              {progress.failedAgent && (
                <> (agent: {progress.failedAgent})</>
              )}
            </div>
          )}

          {/* Pipeline phases */}
          <div className="phases">
            <h3>Pipeline</h3>
            {PIPELINE_PHASES.map((phase) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                progress={progress}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PhaseCardProps {
  phase: { id: string; label: string; agents: string[] };
  progress: ScanProgress;
}

function PhaseCard({ phase, progress }: PhaseCardProps) {
  const isActive = progress.currentPhase === phase.id;
  const completedInPhase = phase.agents.filter((a) =>
    progress.completedAgents.includes(a)
  ).length;
  const allDone = completedInPhase === phase.agents.length;

  let className = 'phase-card';
  if (allDone) className += ' phase-done';
  else if (isActive) className += ' phase-active';

  return (
    <div className={className}>
      <div className="phase-header">
        <span className="phase-icon">
          {allDone ? '\u2705' : isActive ? '\u23F3' : '\u25CB'}
        </span>
        <span className="phase-name">{phase.label}</span>
        <span className="phase-count">
          {completedInPhase}/{phase.agents.length}
        </span>
      </div>

      <div className="agent-grid">
        {phase.agents.map((agent) => {
          const done = progress.completedAgents.includes(agent);
          const active = progress.currentAgent === agent;
          const metrics = progress.agentMetrics[agent];

          let agentClass = 'agent-chip';
          if (done) agentClass += ' agent-done';
          else if (active) agentClass += ' agent-active';

          return (
            <div key={agent} className={agentClass} title={metricsTooltip(metrics)}>
              <span className="agent-name">{agent}</span>
              {metrics?.costUsd != null && (
                <span className="agent-cost">${metrics.costUsd.toFixed(2)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function metricsTooltip(metrics?: { durationMs: number; costUsd: number | null; numTurns: number | null }): string {
  if (!metrics) return '';
  const parts = [
    `Duration: ${formatDuration(metrics.durationMs)}`,
    metrics.costUsd != null ? `Cost: $${metrics.costUsd.toFixed(4)}` : null,
    metrics.numTurns != null ? `Turns: ${metrics.numTurns}` : null,
  ].filter(Boolean);
  return parts.join(' | ');
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
