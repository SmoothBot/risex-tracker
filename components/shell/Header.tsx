"use client";

import { usePathname } from "next/navigation";
import { PAGE_META } from "./nav";
import { AddressSearch } from "./AddressSearch";
import { shortAddr } from "@/lib/format";
import { useWalletLabel } from "@/lib/wallet-labels";

function walletAddrFromPath(pathname: string): string | undefined {
  return pathname.match(/^\/wallets\/(0x[a-fA-F0-9]+)/)?.[1];
}

export function Header() {
  const pathname = usePathname() || "/wallets";
  const walletAddr = walletAddrFromPath(pathname);
  const label = useWalletLabel(walletAddr);

  const meta = walletAddr
    ? {
        title: label ?? shortAddr(walletAddr),
        sub: "Wallet overview · RISEx perps + spot",
      }
    : PAGE_META["/" + (pathname.split("/")[1] || "wallets")] ||
      PAGE_META["/wallets"];

  return (
    <header className="sticky top-0 z-20 flex h-[60px] flex-none items-center gap-4 border-b border-border-subtle bg-[rgba(12,14,18,0.86)] px-6 backdrop-blur-md">
      <div className="mr-1 flex flex-col leading-[1.2]">
        <span className="text-[15px] font-semibold">{meta.title}</span>
        <span className="text-[11px] text-fg-muted">{meta.sub}</span>
      </div>
      <div className="flex-1" />
      <AddressSearch variant="header" />
    </header>
  );
}
