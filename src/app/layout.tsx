import "./globals.css";
import "./section-pages.css";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Quản lý lễ sinh",
  description: "Hệ thống quản lý, điều phối và xếp lịch lễ sinh.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="app-body">
        <div className="app-background" aria-hidden="true" />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
