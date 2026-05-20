import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hosting Panel",
  description: "VirtualMin overlay — simpler management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
