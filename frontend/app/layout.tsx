import type React from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

export const APP_NAME = "StockGoose";
export const metadata: Metadata = {
  title: APP_NAME,
  description: "A cross-platform stock watchlist and market monitor.",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-center"
            richColors
            expand={true}
            visibleToasts={3}
            gap={12}
            toastOptions={{
              duration: 3000,
              closeButton: true,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
