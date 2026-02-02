import { zeroNodePg } from '@rocicorp/zero/server/adapters/pg';
import { Pool } from 'pg';
import { schema } from './schema.js';

const connectionString = process.env.ZERO_UPSTREAM_DB;
if (!connectionString) {
  throw new Error('ZERO_UPSTREAM_DB environment variable is required');
}

const pool = new Pool({
  connectionString,
});
export const dbProvider = zeroNodePg(schema, pool);

declare module '@rocicorp/zero' {
  interface DefaultTypes {
    dbprovider: typeof dbProvider;
  }
}
