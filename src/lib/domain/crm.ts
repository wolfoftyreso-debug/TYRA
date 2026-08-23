export type CrmCustomer = {
  id: string;
  name: string;
};

export type CrmVehicle = {
  id: string;
  registrationNumber: string;
  make?: string | null;
  model?: string | null;
  modelYear?: number | null;
};

export type CrmWheelSet = {
  id: string;
  vehicleId: string | null;
  season: "winter" | "summer" | "all-season" | string;
  status: string;
  storageStatus: string;
  storageCode?: string | null;
  publicCode?: string | null;
};

export type CrmOpportunity = {
  id: string;
  wheelSetId: string;
  status: "open" | "accepted" | "rejected" | "expired" | string;
  reason: string;
};

export type CustomerCard = {
  customer: CrmCustomer;
  vehicles: Array<{
    vehicle: CrmVehicle;
    wheelSets: CrmWheelSet[];
  }>;
  counts: {
    vehicles: number;
    wheelSets: number;
    openOpportunities: number;
  };
  nextAction: {
    label: string;
    kind: "prepare_quote" | "pick" | "check_in" | "none";
  };
};

function by<T>(get: (x: T) => string) {
  return (a: T, b: T) => get(a).localeCompare(get(b), "sv");
}

export function buildCustomerCard(input: {
  customer: CrmCustomer;
  vehicles: CrmVehicle[];
  wheelSets: CrmWheelSet[];
  opportunities: CrmOpportunity[];
}): CustomerCard {
  const wheelSetsByVehicleId = new Map<string, CrmWheelSet[]>();
  for (const ws of input.wheelSets) {
    if (!ws.vehicleId) continue;
    const arr = wheelSetsByVehicleId.get(ws.vehicleId) ?? [];
    arr.push(ws);
    wheelSetsByVehicleId.set(ws.vehicleId, arr);
  }

  const openOpportunities = input.opportunities.filter((o) => o.status === "open");
  const openWheelSetIds = new Set(openOpportunities.map((o) => o.wheelSetId));

  const vehicles = input.vehicles
    .slice()
    .sort(by((v) => v.registrationNumber))
    .map((v) => ({
      vehicle: v,
      wheelSets: (wheelSetsByVehicleId.get(v.id) ?? []).slice().sort(by((ws) => ws.season))
    }));

  const counts = {
    vehicles: input.vehicles.length,
    wheelSets: input.wheelSets.length,
    openOpportunities: openOpportunities.length
  };

  // Next action heuristic (v1):
  // - Open opportunity → prepare quote
  // - Any wheel set in PICK_REQUESTED/QUEUED → pick
  // - Any wheel set in CHECKING_IN/REGISTERED → check-in
  // - Else none
  const hasPick = input.wheelSets.some((ws) =>
    ["PICK_REQUESTED", "QUEUED", "PICKING"].includes(ws.status)
  );
  const hasCheckIn = input.wheelSets.some((ws) =>
    ["CHECKING_IN", "REGISTERED"].includes(ws.status)
  );

  const nextAction: CustomerCard["nextAction"] =
    openWheelSetIds.size > 0
      ? { kind: "prepare_quote", label: "Förbered offert" }
      : hasPick
        ? { kind: "pick", label: "Plocka hjul" }
        : hasCheckIn
          ? { kind: "check_in", label: "Checka in" }
          : { kind: "none", label: "Ingen åtgärd" };

  return {
    customer: input.customer,
    vehicles,
    counts,
    nextAction
  };
}

