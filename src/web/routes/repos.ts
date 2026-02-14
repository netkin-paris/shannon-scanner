// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * Repository listing API route.
 *
 * GET /api/repos — List directories available in /repos
 */

import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

const REPOS_DIR = process.env.REPOS_DIR || '/repos';

export function createReposRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const entries = await fs.readdir(REPOS_DIR, { withFileTypes: true });
      const repos = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

      res.json(repos);
    } catch (error) {
      // If repos directory doesn't exist, return empty list
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        res.json([]);
        return;
      }
      console.error('Failed to list repos:', error);
      res.status(500).json({ error: 'Failed to list repositories' });
    }
  });

  return router;
}
