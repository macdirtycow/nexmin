"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/lib/features";

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-panel-border pb-4">
      {ADMIN_NAV.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className={`rounded-lg px-3 py-2 text-sm ${
            pathname === item.path
              ? "bg-panel-accent/20 text-white"
              : "text-panel-muted hover:bg-panel-card hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
