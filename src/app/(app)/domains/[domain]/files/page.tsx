import { FileManager } from "@/components/FileManager";
import { listDomainFiles } from "@/lib/domain-files";
import { requireDomainAccess } from "@/lib/domain-api";
import { createVirtualMinLoginLink } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function DomainFilesPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let listing = listDomainFiles(domain, "");
  let error = "";
  try {
    if (listing.mode === "virtualmin") {
      listing = {
        ...listing,
        fileManagerUrl: await createVirtualMinLoginLink(domain, session, {
          redirectUrl: "/filemin/index.cgi",
        }),
      };
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon bestandsbeheer niet laden.";
  }
  return (
    <FileManager domain={domain} initialListing={listing} initialError={error} />
  );
}
