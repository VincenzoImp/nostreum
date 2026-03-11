"use client";

import { useEffect, useState } from "react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { Header } from "~~/components/layout/Header";
import { MobileNav } from "~~/components/layout/MobileNav";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { FollowingProvider } from "~~/contexts/FollowingContext";
import { NostrProvider } from "~~/contexts/NostrContext";
import { ProfileCacheProvider } from "~~/contexts/ProfileCacheContext";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <MobileNav />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "16px",
            fontSize: "14px",
            background: "var(--color-base-100)",
            color: "var(--color-base-content)",
            border: "1px solid var(--color-base-300)",
          },
        }}
      />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          avatar={BlockieAvatar}
          theme={
            mounted
              ? isDarkMode
                ? darkTheme({ accentColor: "#A78BFA" })
                : lightTheme({ accentColor: "#7C3AED" })
              : lightTheme({ accentColor: "#7C3AED" })
          }
        >
          <NostrProvider>
            <FollowingProvider>
              <ProfileCacheProvider>
                <AppShell>{children}</AppShell>
              </ProfileCacheProvider>
            </FollowingProvider>
          </NostrProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
