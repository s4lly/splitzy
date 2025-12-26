import { defineQueries, defineQuery } from "@rocicorp/zero";
import { z } from "zod";
import { zql } from "./schema.ts";

export const queries = defineQueries({
  receipts: {
    byId: defineQuery(z.object({ id: z.number() }), ({ args: { id } }) =>
      zql.user_receipts.where("id", id).related("line_items")
    ),
  },
});
