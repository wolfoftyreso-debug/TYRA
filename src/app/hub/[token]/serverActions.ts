"use server";

import { placeTireOrderFromHub } from "@/lib/server/hub";

export async function placeOrderAction(input: {
  token: string;
  tireProductId: string;
  quantity: number;
  enteredRegistrationNumber: string;
}) {
  return placeTireOrderFromHub(input);
}

