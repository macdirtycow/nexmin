import { getAboutBodyHtml } from "@/lib/marketing";
import Script from "next/script";

/** Renders /about from marketing-site/about.html (same style as legal pages). */
export function MarketingAboutPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- shared with the static marketing build; see MarketingHome.tsx. */}
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,500&display=swap"
        rel="stylesheet"
      />
      {/* eslint-disable-next-line @next/next/no-css-tags -- shared with the static marketing build; see MarketingHome.tsx. */}
      <link rel="stylesheet" href="/landing.css" />
      <div dangerouslySetInnerHTML={{ __html: getAboutBodyHtml() }} />
      <Script src="/landing.js" strategy="afterInteractive" />
    </>
  );
}
