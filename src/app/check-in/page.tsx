import { CheckInFlow } from "@/components/check-in-flow";
import { OpsShell } from "@/components/ops-shell";

export default function CheckInPage() {
  return (
    <OpsShell title="Checka in hjul">
      <div className="mx-auto max-w-3xl">
        <CheckInFlow />
      </div>
    </OpsShell>
  );
}
