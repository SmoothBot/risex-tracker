"use client";

import { useState } from "react";
import { tokenMeta } from "@/lib/tokens/registry";
import { CoinChip } from "./CoinChip";

/**
 * Token icon served directly from rise.trade's crypto-icon set
 * (https://www.rise.trade/crypto-icons/<symbol>.svg), with a graceful fallback
 * to a colored letter chip if the icon is missing or fails to load.
 */
export function TokenIcon({
  coin,
  size = 26,
  fontSize,
}: {
  coin: string;
  size?: number;
  fontSize?: number;
}) {
  const [failed, setFailed] = useState(false);

  const sym = (coin || "").toLowerCase();
  if (!sym || failed) {
    return <CoinChip coin={coin} size={size} fontSize={fontSize} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.rise.trade/crypto-icons/${sym}.svg`}
      alt={coin}
      title={tokenMeta(coin)?.name ?? coin}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="flex-none rounded-full object-contain"
      style={{ width: size, height: size, background: "rgba(255,255,255,0.04)" }}
    />
  );
}
