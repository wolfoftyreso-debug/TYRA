import { OpsShell } from "@/components/ops-shell";
import { PickFlow } from "@/components/pick-flow";

export default function PickPage() {
  return (
    <OpsShell title="Plockkö">
      <div className="mx-auto max-w-3xl">
        <PickFlow />
      </div>
    </OpsShell>
  );
}
