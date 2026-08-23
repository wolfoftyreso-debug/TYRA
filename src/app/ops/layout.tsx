import { redirect } from "next/navigation";

import { auth } from "@/lib/server/auth";
import { ensureBootstrap } from "@/lib/server/bootstrap";

export default async function OpsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  await ensureBootstrap({ userId });

  return <div className="ops min-h-screen">{children}</div>;
}

