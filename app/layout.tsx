import type { Metadata } from "next";
import "@/styles/globals.css";
import { QueryProvider } from "@/lib/query";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "RISEx Tracker",
  description: "Trader & market analytics for RISEx.",
  icons: { icon: "/brand/risex-mark.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
