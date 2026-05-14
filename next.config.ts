import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  // 使用相对路径以兼容 Tauri file:// 协议加载
  assetPrefix: "./",
};

export default nextConfig;
