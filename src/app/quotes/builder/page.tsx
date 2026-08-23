import { OpsShell } from "@/components/ops-shell";
import { QuoteBuilder } from "@/components/quote-builder";

export default function QuoteBuilderPage() {
  return (
    <OpsShell title="Bygg offert">
      <QuoteBuilder />
    </OpsShell>
  );
}
