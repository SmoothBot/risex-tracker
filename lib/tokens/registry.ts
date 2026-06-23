// Token registry sourced from the Trust Wallet assets repo
// (https://github.com/trustwallet/assets). Trust Wallet keys assets by
// blockchain + contract address, so we curate a symbol → asset mapping here.
// Logos are served via the jsDelivr CDN mirror of the repo. Metadata (name,
// website, explorer) comes from each asset's info.json.
//
// Tokens Trust Wallet doesn't carry (e.g. HYPE, RISE) have `logo: null` and
// fall back to a colored letter chip; RISE uses the local brand mark.

const CDN = "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains";

export type TokenMeta = {
  name: string;
  /** Full logo URL, or null when no asset exists (fallback to letter chip). */
  logo: string | null;
  website?: string;
  explorer?: string;
};

/** `path` is the segment after `blockchains/`, e.g. "ethereum/info". */
function tw(path: string): string {
  return `${CDN}/${path}/logo.png`;
}

export const TOKENS: Record<string, TokenMeta> = {
  BTC: { name: "Bitcoin", logo: tw("bitcoin/info"), website: "https://bitcoin.org", explorer: "https://blockchain.info" },
  ETH: { name: "Ethereum", logo: tw("ethereum/info"), website: "https://ethereum.org", explorer: "https://etherscan.io" },
  SOL: { name: "Solana", logo: tw("solana/info"), website: "https://solana.com", explorer: "https://explorer.solana.com" },
  BNB: { name: "BNB", logo: tw("smartchain/info"), website: "https://www.bnbchain.org", explorer: "https://bscscan.com" },
  XRP: { name: "XRP", logo: tw("ripple/info"), website: "https://ripple.com/xrp", explorer: "https://xrpscan.com" },
  DOGE: { name: "Dogecoin", logo: tw("doge/info"), website: "https://dogecoin.com", explorer: "https://blockchair.com/dogecoin" },
  AVAX: { name: "Avalanche", logo: tw("avalanchec/info"), website: "https://avax.network", explorer: "https://snowtrace.io" },
  TON: { name: "Toncoin", logo: tw("ton/info"), website: "https://ton.org", explorer: "https://tonscan.org" },
  NEAR: { name: "NEAR Protocol", logo: tw("near/info"), website: "https://near.org", explorer: "https://nearblocks.io" },
  SUI: { name: "Sui", logo: tw("sui/info"), website: "https://sui.io", explorer: "https://suiscan.xyz" },
  SEI: { name: "Sei", logo: tw("sei/info"), website: "https://sei.io", explorer: "https://www.seiscan.app" },
  LINK: {
    name: "Chainlink",
    logo: tw("ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA"),
    website: "https://chain.link",
    explorer: "https://etherscan.io/token/0x514910771AF9Ca656af840dff83E8264EcF986CA",
  },
  ARB: {
    name: "Arbitrum",
    logo: tw("arbitrum/assets/0x912CE59144191C1204E64559FE8253a0e49E6548"),
    website: "https://arbitrum.foundation",
    explorer: "https://arbiscan.io/token/0x912CE59144191C1204E64559FE8253a0e49E6548",
  },
  OP: {
    name: "Optimism",
    logo: tw("optimism/assets/0x4200000000000000000000000000000000000042"),
    website: "https://optimism.io",
    explorer: "https://optimistic.etherscan.io/token/0x4200000000000000000000000000000000000042",
  },
  PEPE: {
    name: "Pepe",
    logo: tw("ethereum/assets/0x6982508145454Ce325dDbE47a25d4ec3d2311933"),
    website: "https://www.pepe.vip",
    explorer: "https://etherscan.io/token/0x6982508145454Ce325dDbE47a25d4ec3d2311933",
  },
  WIF: {
    name: "dogwifhat",
    logo: tw("solana/assets/EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm"),
    website: "https://dogwifcoin.org",
    explorer: "https://solscan.io/token/EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  },
  ZEC: { name: "Zcash", logo: tw("zcash/info"), website: "https://z.cash", explorer: "https://blockchair.com/zcash" },
  ONDO: {
    name: "Ondo",
    logo: tw("ethereum/assets/0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3"),
    website: "https://ondo.finance",
    explorer: "https://etherscan.io/token/0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3",
  },
  // Live on RISEx but not in Trust Wallet — fall back to letter chip.
  HYPE: { name: "Hyperliquid", logo: null, website: "https://hyperliquid.xyz" },
  TAO: { name: "Bittensor", logo: null, website: "https://bittensor.com" },
  VVV: { name: "Venice Token", logo: null, website: "https://venice.ai" },
  LIT: { name: "Litentry", logo: null },
  // Kept for the brand token / other surfaces (not a current market).
  RISE: { name: "RISE", logo: "/brand/risex-mark.svg", website: "https://risechain.com" },
};

export function tokenMeta(symbol: string): TokenMeta | undefined {
  return TOKENS[symbol?.toUpperCase()];
}

export function tokenName(symbol: string): string {
  return tokenMeta(symbol)?.name ?? symbol;
}
