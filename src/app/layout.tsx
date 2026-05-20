import type { Metadata } from "next";
import { APP_NAME, APP_TAGLINE, APP_URL } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: APP_NAME,
  description: APP_TAGLINE,
  openGraph: {
    title: APP_NAME,
    description: APP_TAGLINE,
    url: APP_URL,
    siteName: APP_NAME,
  },
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
