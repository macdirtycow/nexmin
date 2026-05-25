import { getLegalBodyHtml } from "@/lib/marketing";
import Script from "next/script";

type Slug = "privacy" | "terms" | "refund";

export function MarketingLegalPage({ slug }: { slug: Slug }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/landing.css" />
      <div dangerouslySetInnerHTML={{ __html: getLegalBodyHtml(slug) }} />
      <Script src="/landing.js" strategy="afterInteractive" />
    </>
  );
}
