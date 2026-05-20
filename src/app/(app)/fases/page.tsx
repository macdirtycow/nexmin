import { Card } from "@/components/ui";
import { DOMAIN_FEATURES, IMPLEMENTED_PHASE } from "@/lib/features";
const PHASE_LABELS: Record<number, string> = {
  1: "Kern",
  2: "DNS, SSL, aliassen, redirects, back-ups",
  3: "Website & PHP",
  4: "Domeinlevenscyclus",
  5: "Scripts & proxies",
  6: "Mail & FTP uitgebreid",
  7: "Server & reseller",
  8: "Cloud & geavanceerd",
};

export default function FasesPage() {
  const phases = [1, 2, 3, 4, 5, 6, 7, 8] as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Integratiefases</h1>
        <p className="mt-1 text-panel-muted">
          Volledige VirtualMin-dekking in opeenvolgende releases. Nu actief: fase{" "}
          {IMPLEMENTED_PHASE}.
        </p>
        <p className="mt-2 text-sm text-panel-muted">
          Zie <code className="text-white">docs/PHASES.md</code> in het project voor de volledige API-lijst per fase.
        </p>
      </div>

      {phases.map((phase) => {
        const features = DOMAIN_FEATURES.filter((f) => f.phase === phase);
        const done = phase <= IMPLEMENTED_PHASE;
        return (
          <Card key={phase}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-medium text-white">
                Fase {phase} — {PHASE_LABELS[phase]}
              </h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  done
                    ? "bg-emerald-900/50 text-emerald-300"
                    : "bg-slate-800 text-panel-muted"
                }`}
              >
                {done ? "Geïmplementeerd" : "Gepland"}
              </span>
            </div>
            {features.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-panel-muted">
                {features.map((f) => (
                  <li key={f.id}>
                    <span className="text-white">{f.label}</span> — {f.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-panel-muted">
                Server-brede functies — zie docs/PHASES.md
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
