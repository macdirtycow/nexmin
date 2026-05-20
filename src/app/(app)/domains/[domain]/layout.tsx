import { DomainNav } from "@/components/DomainNav";
import { requireDomainAccess } from "@/lib/domain-api";

type Props = {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
};

export default async function DomainLayout({ children, params }: Props) {
  const { domain, session } = await requireDomainAccess((await params).domain);
  return (
    <div className="space-y-6">
      <DomainNav domain={domain} isAdmin={session.role === "admin"} />
      {children}
    </div>
  );
}
