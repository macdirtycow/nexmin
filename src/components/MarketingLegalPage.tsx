import { getLegalBodyHtml } from "@/lib/marketing";
import Script from "next/script";

type Slug = "privacy" | "terms" | "refund";

/**
 * Renders /privacy, /terms, /refund pages by injecting their static HTML
 * body. See MarketingHome.tsx for the architectural rationale on why the
 * font + stylesheet <link> tags live in the component instead of going
 * through next/font / CSS imports.
 */
export function MarketingLegalPage({ slug }: { slug: Slug }) {
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
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      {/* eslint-disable-next-line @next/next/no-css-tags -- shared with the static marketing build; see MarketingHome.tsx. */}
      <link rel="stylesheet" href="/landing.css" />
      <div dangerouslySetInnerHTML={{ __html: getLegalBodyHtml(slug) }} />
      <Script src="/landing.js" strategy="afterInteractive" />
    </>
  );
}
