"use server";

import { acceptOfferOptionFromHub } from "@/lib/server/hub";

export async function acceptOfferOptionAction(input: {
  token: string;
  offerId: string;
  optionId: string;
}) {
  return acceptOfferOptionFromHub(input);
}

