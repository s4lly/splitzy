import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { mustGetQuery } from "@rocicorp/zero";
import { handleQueryRequest } from "@rocicorp/zero/server";
import { queries } from "./queries.js";
import { schema } from "./schema.js";

// Structured logging utility
interface LogContext {
  requestId?: string;
  queryName?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  userID?: string;
  [key: string]: unknown;
}

function log(
  level: "info" | "error" | "warn" | "debug",
  message: string,
  context: LogContext = {}
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const logLine = JSON.stringify(logEntry);

  switch (level) {
    case "error":
      console.error(logLine);
      break;
    case "warn":
      console.warn(logLine);
      break;
    case "debug":
      console.debug(logLine);
      break;
    default:
      console.log(logLine);
  }
}

function generateRequestId(): string {
  // crypto.randomUUID() is available as a global in Node.js 19+
  // For render.com which uses Node.js 20+, this will work
  // @ts-ignore - crypto is a global in Node.js 19+
  return crypto.randomUUID();
}

type AppContext = {
  Variables: {
    requestId: string;
    startTime: number;
  };
};

const app = new Hono<AppContext>();

// Request logging middleware
app.use("*", async (c, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  // Store request ID and start time in context for use in route handlers
  c.set("requestId", requestId);
  c.set("startTime", startTime);

  log("info", "Request started", {
    requestId,
    method,
    path,
    url: c.req.url,
  });

  await next();

  const duration = Date.now() - startTime;
  const statusCode = c.res.status;

  log("info", "Request completed", {
    requestId,
    method,
    path,
    statusCode,
    duration,
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/query", async (c) => {
  const requestId = c.get("requestId");
  const startTime = c.get("startTime");
  let queryName: string | undefined;

  try {
    const result = await handleQueryRequest(
      (name, args) => {
        queryName = name;
        log("debug", "Executing query", {
          requestId,
          queryName,
          userID: "anon",
        });

        const query = mustGetQuery(queries, name);
        return query.fn({ args, ctx: { userID: "anon" } });
      },
      schema,
      c.req.raw
    );

    const duration = Date.now() - startTime;

    log("info", "Query executed successfully", {
      requestId,
      queryName,
      duration,
      userID: "anon",
    });

    return c.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    log("error", "Query execution failed", {
      requestId,
      queryName,
      duration,
      userID: "anon",
      error: errorMessage,
      stack: errorStack,
    });

    // Log detailed error server-side, return generic message to client
    return c.json({ error: "Internal server error", requestId }, 500);
  }
});

const port = Number(process.env.PORT) || 3000;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    log("info", "Server started", {
      port: info.port,
      address: info.address,
      env: process.env.NODE_ENV || "development",
    });
  }
);
