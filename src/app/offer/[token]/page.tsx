import { notFound } from "next/navigation";
import { PublicOffer } from "@/components/public-offer";
import { demoQuote } from "@/lib/demo-data";

export default async function OfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (token !== demoQuote.token) notFound();

  return (
    <div className="public-surface">
      <PublicOffer />
    </div>
  );
}
