import Link from "next/link";
import { Alert, Card } from "@/components/ui";

/**
 * License active in data/license.json but the requested feature is not
 * currently loadable. Differentiates three sub-cases so the operator
 * knows exactly which knob to turn:
 *
 *  - synced=false → Premium tarball never extracted; click Refresh modules.
 *  - synced=true && license has the feature but active.json doesn't
 *      → stale sync; re-run Refresh modules to overwrite.
 *  - synced=true && license itself lacks the feature
 *      → plan doesn't include it; upgrade plan.
 */
export function PremiumSyncModulesCard({
  feature,
  title = "Premium modules not loaded",
  synced = false,
  activeFeatures = [],
  licensedFeatures = [],
}: {
  feature: string;
  title?: string;
  synced?: boolean;
  activeFeatures?: string[];
  licensedFeatures?: string[];
}) {
  const planHasIt = licensedFeatures.includes(feature);
  const activeHasIt = activeFeatures.includes(feature);

  let diagnosis: { body: React.ReactNode; cta: React.ReactNode };
  if (!planHasIt) {
    diagnosis = {
      body: (
        <>
          Your active Premium plan does not include{" "}
          <code className="text-white">{feature}</code>. The features your
          license currently grants are:{" "}
          <code className="text-white">
            {licensedFeatures.join(", ") || "(none)"}
          </code>
          .
        </>
      ),
      cta: (
        <>
          Upgrade your plan at{" "}
          <a
            href="https://license.omiiba.dev/buy"
            className="text-panel-accent hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            license.omiiba.dev/buy
          </a>{" "}
          or re-activate after upgrading.
        </>
      ),
    };
  } else if (!synced) {
    diagnosis = {
      body: (
        <>
          Your license is active and includes{" "}
          <code className="text-white">{feature}</code>, but the Premium
          bundle has not been downloaded to this server yet.
        </>
      ),
      cta: (
        <>
          Click <strong>Refresh modules</strong> on the{" "}
          <Link
            href="/admin/license"
            className="text-panel-accent hover:underline"
          >
            License
          </Link>{" "}
          page. The panel will download the tarball, verify the signature,
          extract it and auto-reload pm2.
        </>
      ),
    };
  } else if (!activeHasIt) {
    diagnosis = {
      body: (
        <>
          A Premium bundle is installed, but it was synced from a license
          that did not include{" "}
          <code className="text-white">{feature}</code>. Your current
          license now includes it, so a re-sync is needed.
        </>
      ),
      cta: (
        <>
          Click <strong>Refresh modules</strong> on the{" "}
          <Link
            href="/admin/license"
            className="text-panel-accent hover:underline"
          >
            License
          </Link>{" "}
          page to overwrite the stale bundle.
        </>
      ),
    };
  } else {
    diagnosis = {
      body: (
        <>
          The Premium bundle is installed and your license includes{" "}
          <code className="text-white">{feature}</code>, but the panel
          process has not picked up the new handler yet.
        </>
      ),
      cta: (
        <>
          Run <code className="text-white">pm2 reload qadbak</code> on the
          VPS, or click <strong>Refresh modules</strong> on the{" "}
          <Link
            href="/admin/license"
            className="text-panel-accent hover:underline"
          >
            License
          </Link>{" "}
          page (which now auto-reloads pm2).
        </>
      ),
    };
  }

  return (
    <Card className="border-amber-500/30 bg-amber-950/20">
      <h2 className="text-lg font-medium text-white">{title}</h2>
      <div className="mt-4">
        <Alert>{diagnosis.body}</Alert>
      </div>
      <p className="mt-4 text-sm text-panel-muted">{diagnosis.cta}</p>
    </Card>
  );
}
