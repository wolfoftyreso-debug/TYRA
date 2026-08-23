import { redirect } from "next/navigation";

import { auth } from "@/lib/server/auth";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  redirect("/ops");
}

