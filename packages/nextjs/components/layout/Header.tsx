"use client";

import { Logo } from "./Logo";
import { NavTabs } from "./NavTabs";
import { ThemeToggle } from "./ThemeToggle";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { ConnectionIndicator } from "~~/components/shared/ConnectionIndicator";

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-base-100/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        <Logo />
        <NavTabs />
        <div className="flex items-center gap-3">
          <ConnectionIndicator />
          <ThemeToggle />
          <RainbowKitCustomConnectButton />
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-base-300/60 to-transparent" />
    </header>
  );
}
