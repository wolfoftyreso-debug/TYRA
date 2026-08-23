import { auth } from "@/lib/server/auth";
import { getActiveOrgForUser } from "@/lib/server/orgs";

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
      <p className="mt-2 text-sm text-white/60">{org.name}</p>

      <CommandBar />

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-medium text-white/60">Idag</div>
          <div className="mt-2 text-sm text-white/80">
            0 hjulskiften • 0 plock • 0 uppmärksamhet • 0 offerter
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-medium text-white/60">Nästa</div>
          <div className="mt-2 text-sm text-white/80">
            Skapa första flödet: check-in → lagra → plock → verkstad.
          </div>
        </div>
      </div>
    </main>
  );
}

