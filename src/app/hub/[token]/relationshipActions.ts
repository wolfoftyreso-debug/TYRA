"use server";

import { createBookingFromHub, updateCommPrefsFromHub } from "@/lib/server/hub";

export async function updatePrefsAction(input: {
  token: string;
  level: "fewer" | "normal" | "updated";
  remindWornTires: boolean;
  remindPrices: boolean;
  remindSeason: boolean;
  remindBookings: boolean;
  remindStorage: boolean;
}) {
  return updateCommPrefsFromHub(input);
}

export async function createBookingAction(input: { token: string; startAtIso: string; endAtIso: string }) {
  return createBookingFromHub(input);
}

