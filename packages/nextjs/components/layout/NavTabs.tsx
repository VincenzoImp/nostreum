"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Feed", href: "/feed" },
  { label: "Bridge", href: "/bridge" },
  { label: "Profile", href: "/profile" },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-0.5">
      {tabs.map(({ label, href }) => {
        const isActive =
          pathname === href ||
          (href === "/feed" && pathname.startsWith("/feed")) ||
          (href !== "/feed" && href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              isActive
                ? "text-primary bg-primary/8"
                : "text-base-content/50 hover:text-base-content hover:bg-base-300/40"
            }`}
          >
            {label}
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
