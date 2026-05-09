import { Hono } from "hono";
import type { Env } from "../types/hono";
import { fail, ok } from "@utils/response";

export const dbRoutes = new Hono<{ Bindings: Env }>();

/**
 * 检查 D1 数据库绑定是否可用。
 */
dbRoutes.get("/health", async (c) => {
  try {
    const result = await c.env.DB.prepare("SELECT 1 AS ok").first<{
      ok: number;
    }>();
    return ok(c, { ok: result?.ok === 1 }, "D1 is healthy");
  } catch (e: any) {
    return fail(c, `D1 error: ${e.message || "Unknown error"}`, 500);
  }
});
