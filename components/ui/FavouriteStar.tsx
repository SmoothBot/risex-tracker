"use client";

import { toggleFavourite, useIsFavourite } from "@/lib/favourite-wallets";

/** Star toggle for favouriting a wallet. Stops propagation so it works in rows/chips. */
export function FavouriteStar({
  address,
  size = 15,
}: {
  address: string;
  size?: number;
}) {
  const fav = useIsFavourite(address);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavourite(address);
      }}
      title={fav ? "Remove favourite" : "Add to favourites"}
      aria-label={fav ? "Remove favourite" : "Add to favourites"}
      aria-pressed={fav}
      className={[
        "flex flex-none items-center justify-center transition-colors",
        fav ? "text-warning" : "text-fg-faint hover:text-fg-muted",
      ].join(" ")}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fav ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.3l-5.8 3.06 1.11-6.46-4.7-4.58 6.49-.94L12 2.5z" />
      </svg>
    </button>
  );
}
