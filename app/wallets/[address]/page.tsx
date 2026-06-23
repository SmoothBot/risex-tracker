import { WalletDetailScreen } from "@/components/screens/wallet/WalletDetailScreen";

export default async function Page({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return <WalletDetailScreen address={address.toLowerCase()} />;
}
