import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hosting Panel",
  description: "VirtualMin overlay — eenvoudiger beheer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
