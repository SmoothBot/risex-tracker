import { coinColor } from "@/lib/format";

export function CoinChip({
  coin,
  size = 26,
  fontSize,
}: {
  coin: string;
  size?: number;
  fontSize?: number;
}) {
  const c = coinColor(coin);
  const fs = fontSize ?? Math.round(size * 0.38);
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full font-mono font-bold"
      style={{
        width: size,
        height: size,
        fontSize: fs,
        background: c + "22",
        color: c,
        border: "1px solid " + c + "55",
      }}
    >
      {coin.slice(0, 3)}
    </span>
  );
}
