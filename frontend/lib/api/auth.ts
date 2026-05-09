import { client } from "./client";
import { unwrap } from "./config";

/**
 * 登录
 */
export async function login(password: string): Promise<boolean> {
  try {
    await unwrap(
      client.auth.login.$post({
        json: { password },
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * 登出
 */
export async function logout(): Promise<boolean> {
  try {
    await unwrap(client.auth.logout.$post());
    return true;
  } catch {
    return false;
  }
}
