"use client";

import { useRouter } from "next/navigation";
import { useFavouriteWallets } from "@/lib/favourite-wallets";
import { addRecentWallet, useRecentWallets } from "@/lib/recent-wallets";
import { WalletName } from "@/components/ui/WalletName";
import { FavouriteStar } from "@/components/ui/FavouriteStar";
import { avatarGradient } from "@/lib/format";

/**
 * Compact quick-access bar above Hot Wallets: a row of favourite wallet chips
 * and a row of recently-viewed chips. Hidden entirely when both are empty.
 */
export function WalletChips() {
  const router = useRouter();
  const favourites = useFavouriteWallets();
  const recent = useRecentWallets();

  const favSet = new Set(favourites);
  const recentOnly = recent.filter((a) => !favSet.has(a)).slice(0, 5);

  if (favourites.length === 0 && recentOnly.length === 0) return null;

  const open = (address: string) => {
    addRecentWallet(address);
    router.push(`/wallets/${address}`);
  };

  const Chip = ({ address }: { address: string }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => open(address)}
      onKeyDown={(e) => (e.key === "Enter" ? open(address) : undefined)}
      className="flex cursor-pointer items-center gap-2 rounded-full border border-border-subtle bg-bg py-[5px] pr-[8px] pl-[8px] transition-colors hover:bg-bg-hover"
    >
      <span
        className="h-[18px] w-[18px] flex-none rounded-full"
        style={{ background: avatarGradient(address) }}
      />
      <WalletName address={address} size={12} />
      <FavouriteStar address={address} size={13} />
    </div>
  );

  const Group = ({
    label,
    addresses,
  }: {
    label: string;
    addresses: string[];
  }) => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-[78px] flex-none text-[10px] font-semibold tracking-[0.12em] text-fg-faint">
        {label}
      </span>
      {addresses.map((a) => (
        <Chip key={a} address={a} />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-[10px] rounded-lg bg-bg-elevated p-[16px]">
      {favourites.length > 0 ? (
        <Group label="FAVOURITES" addresses={favourites} />
      ) : null}
      {recentOnly.length > 0 ? (
        <Group label="RECENT" addresses={recentOnly} />
      ) : null}
    </div>
  );
}
