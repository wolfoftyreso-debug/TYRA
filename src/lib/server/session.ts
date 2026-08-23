import { auth } from "./auth";
import { getActiveOrgForUser } from "./orgs";

export async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Du måste vara inloggad.");
  return userId;
}

export async function requireActiveOrg() {
  const userId = await requireUserId();
  const org = await getActiveOrgForUser({ userId });
  return { userId, org };
}

