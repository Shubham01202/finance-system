// Path: frontend/src/app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SN Finance Service",
  description: "SN Finance Service - Your trusted partner for safe and fast loans.",
  icons: {
    icon:     "/images/SN-Finance-Service-Logo-1.png",
    apple:    "/images/SN-Finance-Service-Logo-1.png",
    shortcut: "/images/SN-Finance-Service-Logo-1.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100`}>
        {children}
      </body>
    </html>
  );
}
