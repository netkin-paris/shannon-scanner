// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * Scan management API routes.
 *
 * GET  /api/scans       — List all Shannon workflows from Temporal
 * POST /api/scans       — Start a new pentest pipeline workflow
 * GET  /api/scans/:id   — Get detailed progress for a specific scan
 */

import { Router } from 'express';
import type { Client } from '@temporalio/client';
import type { PipelineInput, PipelineProgress } from '../../temporal/shared.js';
import { sanitizeHostname } from '../../audit/utils.js';

const PROGRESS_QUERY = 'getProgress';

interface ScanListItem {
  workflowId: string;
  status: string;
  startTime: string | null;
  closeTime: string | null;
}

interface StartScanBody {
  url: string;
  repo: string;
  configPath?: string;
  pipelineTesting?: boolean;
}

export function createScansRouter(client: Client): Router {
  const router = Router();

  // List all Shannon workflows
  router.get('/', async (_req, res) => {
    try {
      const scans: ScanListItem[] = [];

      const workflows = client.workflow.list({
        query: "WorkflowType = 'pentestPipelineWorkflow'",
      });

      for await (const workflow of workflows) {
        scans.push({
          workflowId: workflow.workflowId,
          status: normalizeStatus(workflow.status.name),
          startTime: workflow.startTime?.toISOString() ?? null,
          closeTime: workflow.closeTime?.toISOString() ?? null,
        });
      }

      // Sort newest first
      scans.sort((a, b) => {
        const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return timeB - timeA;
      });

      res.json(scans);
    } catch (error) {
      console.error('Failed to list scans:', error);
      res.status(500).json({ error: 'Failed to list scans' });
    }
  });

  // Start a new scan
  router.post('/', async (req, res) => {
    try {
      const body = req.body as StartScanBody;

      if (!body.url || !body.repo) {
        res.status(400).json({ error: 'url and repo are required' });
        return;
      }

      const hostname = sanitizeHostname(body.url);
      const workflowId = `${hostname}_shannon-${Date.now()}`;

      const repoPath = `/repos/${body.repo}`;

      const input: PipelineInput = {
        webUrl: body.url,
        repoPath,
        ...(body.configPath !== undefined && { configPath: body.configPath }),
        ...(body.pipelineTesting !== undefined && { pipelineTestingMode: body.pipelineTesting }),
      };

      await client.workflow.start('pentestPipelineWorkflow', {
        taskQueue: 'shannon-pipeline',
        workflowId,
        args: [input],
      });

      res.status(201).json({ workflowId });
    } catch (error) {
      console.error('Failed to start scan:', error);
      const message = error instanceof Error ? error.message : 'Failed to start scan';
      res.status(500).json({ error: message });
    }
  });

  // Get scan progress
  router.get('/:id', async (req, res) => {
    try {
      const workflowId = req.params.id;
      if (!workflowId) {
        res.status(400).json({ error: 'Workflow ID is required' });
        return;
      }

      const handle = client.workflow.getHandle(workflowId);

      // Try querying progress (works for running workflows)
      try {
        const progress = await handle.query<PipelineProgress>(PROGRESS_QUERY);
        res.json(progress);
        return;
      } catch {
        // Query may fail for completed/failed workflows — fall back to describe
      }

      // Fall back to workflow description for completed/failed workflows
      const description = await handle.describe();
      res.json({
        workflowId,
        status: normalizeStatus(description.status.name),
        startTime: description.startTime?.getTime() ?? Date.now(),
        closeTime: description.closeTime?.toISOString() ?? null,
        elapsedMs: description.closeTime && description.startTime
          ? description.closeTime.getTime() - description.startTime.getTime()
          : Date.now() - (description.startTime?.getTime() ?? Date.now()),
        currentPhase: null,
        currentAgent: null,
        completedAgents: [],
        failedAgent: null,
        error: null,
        agentMetrics: {},
        summary: null,
      });
    } catch (error) {
      console.error('Failed to get scan progress:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        res.status(404).json({ error: 'Scan not found' });
      } else {
        res.status(500).json({ error: 'Failed to get scan progress' });
      }
    }
  });

  return router;
}

/**
 * Normalize Temporal workflow status enum names to simple lowercase strings.
 * e.g. "WORKFLOW_EXECUTION_STATUS_RUNNING" → "running"
 */
function normalizeStatus(statusName: string): string {
  const mapping: Record<string, string> = {
    WORKFLOW_EXECUTION_STATUS_RUNNING: 'running',
    WORKFLOW_EXECUTION_STATUS_COMPLETED: 'completed',
    WORKFLOW_EXECUTION_STATUS_FAILED: 'failed',
    WORKFLOW_EXECUTION_STATUS_CANCELED: 'canceled',
    WORKFLOW_EXECUTION_STATUS_TERMINATED: 'terminated',
    WORKFLOW_EXECUTION_STATUS_TIMED_OUT: 'timed_out',
    WORKFLOW_EXECUTION_STATUS_CONTINUED_AS_NEW: 'running',
  };
  return mapping[statusName] ?? statusName.toLowerCase();
}
