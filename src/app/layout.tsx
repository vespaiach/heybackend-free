import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "HeyBackend - Free AI Backend for Everyone",
  description:
    "HeyBackend is a free AI backend service that provides a simple and efficient way to integrate AI capabilities into your applications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", "font-sans")}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
