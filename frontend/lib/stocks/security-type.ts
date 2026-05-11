/**
 * 证券类型映射
 * 根据 securityType 代码获取对应的类型名称
 * 映射规则与主流平台（东方财富、同花顺）保持一致
 */

export type SecurityType =
  | "1" // 沪A
  | "2" // 深A
  | "6" // 港股
  | "7" // 美股ETF
  | "8" // A股/港股ETF
  | "9" // 板块/概念
  | "11" // 指数
  | "12" // 期货
  | "14" // 期权
  | "16" // 债券
  | "20"; // 美股

/**
 * securityType 到 securityTypeName 的映射
 */
export const SECURITY_TYPE_MAP: Record<SecurityType, string> = {
  "1": "沪A",
  "2": "深A",
  "6": "港股",
  "7": "美股ETF",
  "8": "基金",
  "9": "板块",
  "11": "指数",
  "12": "期货",
  "14": "期权",
  "16": "债券",
  "20": "美股",
};

/**
 * 根据 securityType 获取类型名称
 * @param type - securityType 代码
 * @returns 类型名称，未知类型返回 undefined
 */
export function getSecurityTypeName(type: string): string | undefined {
  return SECURITY_TYPE_MAP[type as SecurityType];
}
