import { zeroNodePg } from "@rocicorp/zero/server/adapters/pg";
import { Pool } from "pg";
import { schema } from "./schema.js";

const pool = new Pool({
  connectionString: process.env.ZERO_UPSTREAM_DB,
});
export const dbProvider = zeroNodePg(schema, pool);

declare module "@rocicorp/zero" {
  interface DefaultTypes {
    dbprovider: typeof dbProvider;
  }
}
