// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * Shared Temporal client connection for the web server.
 *
 * Maintains a single long-lived connection to Temporal that is reused
 * across all API requests.
 */

import { Connection, Client } from '@temporalio/client';

let connection: Connection | null = null;
let client: Client | null = null;

export async function createTemporalClient(): Promise<Client> {
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  console.log(`Connecting to Temporal at ${address}...`);

  connection = await Connection.connect({ address });
  client = new Client({ connection });

  console.log('Connected to Temporal.');
  return client;
}

export async function closeTemporalConnection(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
    client = null;
  }
}
