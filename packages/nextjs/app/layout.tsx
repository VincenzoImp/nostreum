import "@rainbow-me/rainbowkit/styles.css";
import "@scaffold-ui/components/styles.css";
import { ClientProviders } from "~~/components/ClientProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Nostreum",
  description: "Bridge Ethereum and Nostr — on-chain identity verification with BIP-340 Schnorr signatures",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={``}>
      <body>
        <ThemeProvider enableSystem>
          <ClientProviders>{children}</ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
