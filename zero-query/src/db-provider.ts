import { zeroNodePg } from '@rocicorp/zero/server/adapters/pg';
import { schema } from '@splitzy/shared-zero/schema';
import { Pool } from 'pg';

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
