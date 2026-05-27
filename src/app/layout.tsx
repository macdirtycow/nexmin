import type { Metadata } from "next";
import { BrandingHead } from "@/components/BrandingHead";
import { displayBranding, loadPanelBranding } from "@/lib/branding";
import { APP_NAME, APP_TAGLINE, APP_URL } from "@/lib/brand";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const stored = await loadPanelBranding();
  const b = displayBranding(stored);
  return {
    metadataBase: new URL(APP_URL),
    title: b.brandName,
    description: b.tagline,
    openGraph: {
      title: b.brandName,
      description: b.tagline,
      url: APP_URL,
      siteName: b.brandName,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <BrandingHead />
        {children}
      </body>
    </html>
  );
}
