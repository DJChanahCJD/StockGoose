import type { MetadataRoute } from "next";
import { APP_NAME } from "./layout";

export const dynamic = "force-static";

/**
 * 提供浏览器安装应用所需的最小 Web App Manifest。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: "StockGoose",
    description: "A cross-platform stock watchlist and market monitor.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
