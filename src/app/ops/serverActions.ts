"use server";

import { parseCommand } from "@/lib/command";
import { requireActiveOrg } from "@/lib/server/session";
import {
  lookupByRegistration,
  lookupByStoragePosition,
  lookupByWheelSetCode
} from "@/lib/server/search";

export type CommandResponse =
  | { kind: "navigate"; to: "pick_queue" | "quotes_queue" }
  | { kind: "navigate"; to: "cases" }
  | { kind: "vehicle"; data: Awaited<ReturnType<typeof lookupByRegistration>> }
  | {
      kind: "position";
      data: Awaited<ReturnType<typeof lookupByStoragePosition>>;
    }
  | {
      kind: "wheel_set";
      data: Awaited<ReturnType<typeof lookupByWheelSetCode>>;
    }
  | { kind: "unknown"; message: string };

export async function runCommandAction(input: { text: string }): Promise<CommandResponse> {
  const cmd = parseCommand(input.text);
  if (cmd.kind === "unknown") {
    return {
      kind: "unknown",
      message:
        "Jag förstod inte. Prova regnr (ABC123), hyllkod (A-04-B-12), WS-kod (WS-XXXX), 'ärenden', 'plockkö' eller 'offerter'."
    };
  }

  const { org } = await requireActiveOrg();

  if (cmd.kind === "navigate") return { kind: "navigate", to: cmd.to };

  if (cmd.kind === "lookup_registration") {
    const data = await lookupByRegistration({
      organizationId: org.id,
      registrationNumber: cmd.registrationNumber
    });
    return { kind: "vehicle", data };
  }

  if (cmd.kind === "lookup_storage_position") {
    const data = await lookupByStoragePosition({
      organizationId: org.id,
      code: cmd.code
    });
    return { kind: "position", data };
  }

  if (cmd.kind === "lookup_wheel_set_code") {
    const data = await lookupByWheelSetCode({
      organizationId: org.id,
      code: cmd.code
    });
    return { kind: "wheel_set", data };
  }

  return { kind: "unknown", message: "Okänd kommandotyp." };
}

