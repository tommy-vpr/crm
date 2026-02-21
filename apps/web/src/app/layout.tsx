import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import "@/styles/globals.css";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cultivated CRM",
  description: "CRM for Cultivated Agency",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ConfirmProvider>{children}</ConfirmProvider>
        </Providers>
      </body>
    </html>
  );
}
