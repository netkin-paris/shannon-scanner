// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * Shared Temporal client connection for the web server.
 *
 * Uses lazy initialization — connects on first use so the web server
 * can start even when Temporal is not yet available.  Reconnects
 * automatically if the connection drops.
 */

import { Connection, Client } from '@temporalio/client';

let connection: Connection | null = null;
let client: Client | null = null;
let connecting: Promise<Client> | null = null;

export function getTemporalAddress(): string {
  return process.env.TEMPORAL_ADDRESS || 'localhost:7233';
}

export async function getTemporalClient(): Promise<Client> {
  if (client) return client;

  // Deduplicate concurrent connection attempts
  if (connecting) return connecting;

  connecting = (async () => {
    const address = getTemporalAddress();
    console.log(`Connecting to Temporal at ${address}...`);

    try {
      connection = await Connection.connect({ address });
      client = new Client({ connection });
      console.log('Connected to Temporal.');
      return client;
    } catch (error) {
      // Reset so next call retries
      connection = null;
      client = null;
      throw error;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

export async function closeTemporalConnection(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
    client = null;
  }
}
