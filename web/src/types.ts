export interface ScanListItem {
  workflowId: string;
  status: string;
  startTime: string | null;
  closeTime: string | null;
}

export interface AgentMetrics {
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  numTurns: number | null;
  model?: string;
}

export interface ScanProgress {
  workflowId: string;
  status: string;
  currentPhase: string | null;
  currentAgent: string | null;
  completedAgents: string[];
  failedAgent: string | null;
  error: string | null;
  startTime: number;
  elapsedMs: number;
  agentMetrics: Record<string, AgentMetrics>;
  summary: {
    totalCostUsd: number;
    totalDurationMs: number;
    totalTurns: number;
    agentCount: number;
  } | null;
}
