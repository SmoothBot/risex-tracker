"use client";

import { useWalletLabel } from "@/lib/wallet-labels";
import { shortAddr } from "@/lib/format";

/**
 * Renders a wallet's user-defined label if set, otherwise the short address.
 * When labeled and `withAddr`, the short address is shown muted underneath.
 */
export function WalletName({
  address,
  withAddr = false,
  bracketAddr = false,
  size = 13,
}: {
  address: string;
  /** Show the short address on a muted second line below the label. */
  withAddr?: boolean;
  /** Show the short address inline in parentheses after the label (same line). */
  bracketAddr?: boolean;
  size?: number;
}) {
  const label = useWalletLabel(address);

  if (!label) {
    return (
      <span className="font-mono font-medium" style={{ fontSize: size }} title={address}>
        {shortAddr(address)}
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-col gap-[2px]" title={address}>
      <span className="flex items-center gap-[5px] min-w-0">
        <span className="h-[6px] w-[6px] flex-none rounded-full bg-brand" />
        <span className="truncate font-medium text-fg" style={{ fontSize: size }}>
          {label}
        </span>
        {bracketAddr ? (
          <span className="flex-none font-mono text-fg-faint" style={{ fontSize: size - 1.5 }}>
            ({shortAddr(address)})
          </span>
        ) : null}
      </span>
      {withAddr ? (
        <span className="font-mono text-[10px] text-fg-faint">
          {shortAddr(address)}
        </span>
      ) : null}
    </span>
  );
}
