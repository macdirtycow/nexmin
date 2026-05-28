import { useEffect, useRef } from "react";

/** Re-run reset when navigating between /domains/[domain]/… pages. */
export function useDomainNavReset(domain: string, reset: () => void): void {
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => {
    resetRef.current();
  }, [domain]);
}
