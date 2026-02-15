// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * Shannon Web App — Express API server.
 *
 * Provides REST endpoints for managing scans and serves the React frontend.
 * Temporal connection is lazy — the server starts immediately and connects
 * to Temporal on first API request.
 *
 * Endpoints:
 *   GET  /api/scans       — List all workflows (past + running)
 *   POST /api/scans       — Start a new scan
 *   GET  /api/scans/:id   — Get scan progress
 *   GET  /api/repos       — List available repositories
 *
 * Environment:
 *   TEMPORAL_ADDRESS  — Temporal gRPC address (default: localhost:7233)
 *   PORT              — HTTP port (default: 3000)
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createScansRouter } from './routes/scans.js';
import { createReposRouter } from './routes/repos.js';
import { closeTemporalConnection, getTemporalAddress } from './temporal-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);

function main(): void {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API routes (Temporal client is resolved lazily per-request)
  app.use('/api/scans', createScansRouter());
  app.use('/api/repos', createReposRouter());

  // Serve static frontend (built React app)
  const staticDir = path.resolve(__dirname, '..', '..', 'web', 'dist');
  app.use(express.static(staticDir));

  // SPA fallback — serve index.html for all non-API routes
  // Express 5 requires named wildcard parameters
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shannon Web UI listening on http://0.0.0.0:${PORT}`);
    console.log(`Temporal address: ${getTemporalAddress()} (lazy connect)`);
  });

  // Graceful shutdown
  function shutdown(): void {
    console.log('Shutting down...');
    server.close(() => {
      closeTemporalConnection().then(() => process.exit(0));
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
