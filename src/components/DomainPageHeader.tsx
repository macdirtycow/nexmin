export function DomainPageHeader({
  domain,
  title,
  description,
}: {
  domain: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-1 text-sm text-panel-muted">
        {description ?? domain}
      </p>
    </div>
  );
}
