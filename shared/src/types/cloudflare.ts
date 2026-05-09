// Cloudflare KV list参数
export type ListOptions = {
  prefix?: string;
  limit?: number;
  cursor?: string;
};

// kv list的结果
export type ListFilesResponse = {
  keys: any[];
  list_complete: boolean;
  cursor?: string;
  cacheStatus?: string | null;
};
