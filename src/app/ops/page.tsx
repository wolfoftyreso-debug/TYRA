import { auth } from "@/lib/server/auth";
import { getActiveOrgForUser } from "@/lib/server/orgs";

import { Card } from "@/components/ui/Card";
import { CommandBar } from "./CommandBar";

export default async function OpsHome() {
  const session = await auth();
  const userId = session?.user?.id!;
  const org = await getActiveOrgForUser({ userId });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        God morgon{session?.user?.name ? `, ${session.user.name}` : ""}
      </h1>
      <p className="mt-2 text-base text-[var(--tyra-muted)]">{org.name}</p>

      <CommandBar />

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <Card>
          <div className="text-xs font-medium text-[var(--tyra-muted)]">Idag</div>
          <div className="mt-2 text-base text-[var(--tyra-muted)]">
            0 hjulskiften • 0 plock • 0 uppmärksamhet • 0 offerter
          </div>
        </Card>
        <Card>
          <div className="text-xs font-medium text-[var(--tyra-muted)]">Nästa</div>
          <div className="mt-2 text-base text-[var(--tyra-muted)]">
            Skapa första flödet: check-in → lagra → plock → verkstad.
          </div>
        </Card>
      </div>
    </main>
  );
}

