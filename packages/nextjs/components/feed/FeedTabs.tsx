"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Explore", href: "/feed" },
  { label: "Following", href: "/feed/following" },
];

export function FeedTabs() {
  const pathname = usePathname();

  return (
    <div className="sticky top-16 z-10 bg-base-200/80 backdrop-blur-xl border-b border-base-300/30">
      <div className="flex">
        {tabs.map(({ label, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 text-center py-3.5 text-sm font-semibold transition-colors relative ${
                isActive ? "text-primary" : "text-base-content/40 hover:text-base-content/60"
              }`}
            >
              {label}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
