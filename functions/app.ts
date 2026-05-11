import { corsMiddleware } from "./middleware/cors";
import { proxyRoutes } from "./routes/proxy";
import { stockRoutes } from "./routes/stocks";

import { Hono } from "hono";
import type { Env } from "./types/hono";

export const app = new Hono<{
  Bindings: Env;
}>().basePath("");

// Global Middleware
app.use("*", corsMiddleware);
app.route("/proxy", proxyRoutes);

app.route("/stocks", stockRoutes);

// Export AppType for RPC
export type AppType = typeof app;
