import { Card } from "@/components/ui/Card";
import { requireActiveOrg } from "@/lib/server/session";
import { getOrgPolicies } from "@/lib/server/orgPolicies";
import { SettingsClient } from "./ui";

export default async function OpsSettingsPage() {
  const { org } = await requireActiveOrg();
  const policies = await getOrgPolicies({ organizationId: org.id });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="text-sm text-[var(--tyra-muted)]">Inställningar</div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Policy</h1>

      <Card className="mt-8" pad="lg">
        <div className="text-sm font-medium">Kassering efter eskalering</div>
        <div className="mt-2 text-sm text-[var(--tyra-muted)]">
          Styr hur länge glömda hjul (efter 3 påminnelser + rekommenderat brev) ligger kvar innan de kan markeras som
          kasserade automatiskt.
        </div>

        <div className="mt-4">
          <SettingsClient forgottenDisposeAfterDays={policies.forgotten_dispose_after_days} />
        </div>
      </Card>
    </main>
  );
}

