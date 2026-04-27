import { createClerkClient } from '@clerk/backend';
import { serve } from '@hono/node-server';
import { mustGetMutator, mustGetQuery } from '@rocicorp/zero';
import { handleMutateRequest, handleQueryRequest } from '@rocicorp/zero/server';
import { mutators } from '@splitzy/shared-zero/mutators';
import { queries } from '@splitzy/shared-zero/queries';
import { schema } from '@splitzy/shared-zero/schema';
import { Hono } from 'hono';

import { dbProvider } from './db-provider.js';

const BUILD_VERSION = process.env.BUILD_VERSION || 'unknown';

// Structured logging utility
interface LogContext {
  requestId?: string;
  queryName?: string;
  mutatorName?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  userID?: string;
  [key: string]: unknown;
}

function log(
  level: 'info' | 'error' | 'warn' | 'debug',
  message: string,
  context: LogContext = {}
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    version: BUILD_VERSION,
    ...context,
  };
  const logLine = JSON.stringify(logEntry);

  switch (level) {
    case 'error':
      console.error(logLine);
      break;
    case 'warn':
      console.warn(logLine);
      break;
    case 'debug':
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

// Validate Clerk environment variables
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;

if (!CLERK_SECRET_KEY) {
  const errorMessage =
    'Missing required Clerk environment variable: CLERK_SECRET_KEY. Add it to your .env file (see .env.example for reference).';
  log('error', errorMessage);
  throw new Error(errorMessage);
}

if (!CLERK_PUBLISHABLE_KEY) {
  const errorMessage =
    'Missing required Clerk environment variable: CLERK_PUBLISHABLE_KEY. Add it to your .env file (see .env.example for reference).';
  log('error', errorMessage);
  throw new Error(errorMessage);
}

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: CLERK_SECRET_KEY,
  publishableKey: CLERK_PUBLISHABLE_KEY,
});

// Parse authorized parties from CLERK_AUTHORIZED_PARTIES
// This must be non-empty to ensure azp validation is always enforced
const CLERK_AUTHORIZED_PARTIES = process.env.CLERK_AUTHORIZED_PARTIES;

if (!CLERK_AUTHORIZED_PARTIES) {
  const errorMessage =
    'Missing required environment variable: CLERK_AUTHORIZED_PARTIES. This must be set to a comma-separated list of allowed origins for Clerk azp validation. Add it to your .env file.';
  log('error', errorMessage);
  throw new Error(errorMessage);
}

const authorizedParties = CLERK_AUTHORIZED_PARTIES.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (authorizedParties.length === 0) {
  const errorMessage =
    'CLERK_AUTHORIZED_PARTIES must contain at least one valid origin. The current value results in an empty allowlist, which would disable Clerk azp validation. Please provide a comma-separated list of allowed origins.';
  log('error', errorMessage);
  throw new Error(errorMessage);
}

// Request logging middleware
app.use('*', async (c, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  // Store request ID and start time in context for use in route handlers
  c.set('requestId', requestId);
  c.set('startTime', startTime);

  log('info', 'Request started', {
    requestId,
    method,
    path,
    url: c.req.url,
  });

  await next();

  const duration = Date.now() - startTime;
  const statusCode = c.res.status;

  log('info', 'Request completed', {
    requestId,
    method,
    path,
    statusCode,
    duration,
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: BUILD_VERSION,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/query', async (c) => {
  const requestId = c.get('requestId');
  const startTime = c.get('startTime');
  let queryName: string | undefined;
  let userID = 'anon';

  try {
    const { toAuth } = await clerkClient.authenticateRequest(c.req.raw, {
      authorizedParties,
    });

    const auth = toAuth();
    userID = auth?.userId ?? 'anon';

    const result = await handleQueryRequest(
      (name, args) => {
        queryName = name;
        log('debug', 'Executing query', {
          requestId,
          queryName,
          userID,
        });

        const query = mustGetQuery(queries, name);
        return query.fn({ args, ctx: { userID } });
      },
      schema,
      c.req.raw
    );

    const duration = Date.now() - startTime;

    log('info', 'Query executed successfully', {
      requestId,
      queryName,
      duration,
      userID,
    });

    return c.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    log('error', 'Query execution failed', {
      requestId,
      queryName,
      duration,
      userID,
      error: errorMessage,
      stack: errorStack,
    });

    // Log detailed error server-side, return generic message to client
    return c.json({ error: 'Internal server error', requestId }, 500);
  }
});

app.post('/api/mutate', async (c) => {
  const requestId = c.get('requestId');
  const startTime = c.get('startTime');
  let mutatorName: string | undefined;
  let userID: string | null = null;

  try {
    const { toAuth } = await clerkClient.authenticateRequest(c.req.raw, {
      authorizedParties,
    });
    const auth = toAuth();
    userID = auth?.userId ?? null;

    const result = await handleMutateRequest(
      dbProvider,
      (transact) =>
        transact((tx, name, args) => {
          mutatorName = name;
          log('debug', 'Executing mutator', {
            requestId,
            mutatorName,
            userID: userID ?? 'anon',
          });

          const mutator = mustGetMutator(mutators, name);
          return mutator.fn({ args, tx, ctx: { userID } });
        }),
      c.req.raw
    );

    const duration = Date.now() - startTime;

    log('info', 'Mutator executed successfully', {
      requestId,
      mutatorName,
      duration,
      userID: userID ?? 'anon',
    });

    return c.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    log('error', 'Mutator execution failed', {
      requestId,
      mutatorName,
      duration,
      userID: userID ?? 'anon',
      error: errorMessage,
      stack: errorStack,
    });

    // Log detailed error server-side, return generic message to client
    return c.json({ error: 'Internal server error', requestId }, 500);
  }
});

const port = Number(process.env.PORT) || 3000;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    log('info', 'Server started', {
      port: info.port,
      address: info.address,
      env: process.env.NODE_ENV || 'development',
    });
  }
);
