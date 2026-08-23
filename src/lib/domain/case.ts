import type { CanonicalOperation } from "./services";

export type TireCaseIntent =
  | "TIRE_SWAP_APPOINTMENT"
  | "STORE_ONLY"
  | "PICKUP_ONLY"
  | "QUOTE_ONLY"
  | "MIXED";

export type CaseStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "DONE"
  | "CANCELLED";

export type WorkStatus =
  | "NOT_READY"
  | "READY"
  | "WAITING_FOR_TECHNICIAN"
  | "IN_PROGRESS"
  | "DONE";

export type WheelPhysicalStatus =
  | "UNKNOWN"
  | "STORED"
  | "PICK_REQUESTED"
  | "PICKED"
  | "STAGED"
  | "IN_WORKSHOP"
  | "MOUNTED"
  | "CHECKING_IN"
  | "CHECKED_OUT";

export type CommercialStatus =
  | "NOT_REQUIRED"
  | "QUOTE_DRAFT"
  | "QUOTE_SENT"
  | "QUOTE_ACCEPTED"
  | "ORDER_PLACED"
  | "INVOICED";

export type DocumentationStatus =
  | "NOT_REQUIRED"
  | "REQUIRED"
  | "IN_PROGRESS"
  | "DONE";

export type CaseContext = {
  organizationId: string;
  customerId?: string | null;
  vehicleId?: string | null;
  wheelSetIds: string[];
};

export type TireLifecycleCase = {
  id: string;
  intent: TireCaseIntent;
  context: CaseContext;
  requestedOperations: CanonicalOperation[];
  sourceState: {
    wheelPhysicalStatus: WheelPhysicalStatus;
    storageCode?: string | null;
  };
  targetState: {
    wheelPhysicalStatus: WheelPhysicalStatus;
    storageCode?: string | null;
  };
  status: {
    case: CaseStatus;
    work: WorkStatus;
    wheel: WheelPhysicalStatus;
    commercial: CommercialStatus;
    documentation: DocumentationStatus;
  };
};

export type WorkflowStepKind =
  | "RETRIEVE_WHEELS"
  | "VERIFY_IDENTITY"
  | "INSPECT_WHEELS"
  | "BALANCE"
  | "WASH"
  | "SWAP_ON_VEHICLE"
  | "MEASURE_TREAD"
  | "PHOTO_WHEELS"
  | "STORE_WHEELS"
  | "HANDOUT_WHEELS"
  | "CREATE_QUOTE"
  | "ORDER_TYRES"
  | "INSTALL_TYRES";

export type WorkflowStep = {
  kind: WorkflowStepKind;
  title: string;
  status: "TODO" | "DOING" | "DONE" | "BLOCKED";
  required: boolean;
  requires: {
    photos?: boolean;
    treadMeasurements?: boolean;
    tpmsCheck?: boolean;
  };
};

export type WorkCard = {
  caseId: string;
  headline: string; // e.g. "VOLVO XC60 — ABC123"
  summary: string; // e.g. "Hjulskifte från hotell + tvätt + balansering"
  nextBestAction: { title: string; stepKind: WorkflowStepKind } | null;
  steps: WorkflowStep[];
};

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function includesAny<T extends string>(haystack: T[], needles: T[]) {
  return needles.some((n) => haystack.includes(n));
}

// Workflow resolver (v1):
// Deterministic compilation of canonical operations + current physical state into steps.
// This is the core "operativa motorn" surface that technicians see.
export function resolveWorkflow(input: {
  intent: TireCaseIntent;
  requestedOperations: CanonicalOperation[];
  sourceWheelStatus: WheelPhysicalStatus;
  targetWheelStatus: WheelPhysicalStatus;
}): WorkflowStep[] {
  const ops = unique(input.requestedOperations);
  const steps: WorkflowStep[] = [];

  const wantsWash = ops.includes("WHEEL_WASH");
  const wantsBalance = ops.includes("WHEEL_BALANCE");
  const wantsSwap = includesAny(ops, [
    "TIRE_SWAP",
    "TIRE_SWAP_FROM_STORAGE",
    "TIRE_SWAP_TO_STORAGE",
    "NEW_CUSTOMER_SWAP_AND_STORE",
    "EXISTING_CUSTOMER_SWAP_AND_STORE",
    "CUSTOMER_CARRIED_WHEELS_SWAP"
  ]);
  const wantsStorageIn = includesAny(ops, [
    "STORAGE_IN",
    "TIRE_SWAP_TO_STORAGE",
    "NEW_CUSTOMER_SWAP_AND_STORE",
    "EXISTING_CUSTOMER_SWAP_AND_STORE"
  ]);
  const wantsStorageOut = includesAny(ops, ["STORAGE_OUT", "TIRE_SWAP_FROM_STORAGE"]);
  const wantsQuote = includesAny(ops, ["TIRE_QUOTE", "TIRE_REPLACEMENT_REQUIRED", "TIRE_REPLACEMENT_RECOMMENDED"]);

  if (wantsStorageOut && input.sourceWheelStatus === "STORED") {
    steps.push({
      kind: "RETRIEVE_WHEELS",
      title: "Hämta hjul",
      status: "TODO",
      required: true,
      requires: {}
    });
    steps.push({
      kind: "VERIFY_IDENTITY",
      title: "Kontrollera identitet",
      status: "TODO",
      required: true,
      requires: {}
    });
  }

  if (wantsSwap) {
    steps.push({
      kind: "INSPECT_WHEELS",
      title: "Kontrollera skick",
      status: "TODO",
      required: true,
      requires: {}
    });
    if (wantsBalance) {
      steps.push({
        kind: "BALANCE",
        title: "Balansera",
        status: "TODO",
        required: true,
        requires: {}
      });
    }
    steps.push({
      kind: "SWAP_ON_VEHICLE",
      title: "Montera",
      status: "TODO",
      required: true,
      requires: { tpmsCheck: true }
    });
  }

  // Documentation tasks (v1: always required on store-in flows)
  if (wantsStorageIn) {
    steps.push({
      kind: "PHOTO_WHEELS",
      title: "Fotografera avtagna hjul",
      status: "TODO",
      required: true,
      requires: { photos: true }
    });
    steps.push({
      kind: "MEASURE_TREAD",
      title: "Mät mönsterdjup",
      status: "TODO",
      required: true,
      requires: { treadMeasurements: true }
    });
  }

  if (wantsWash) {
    steps.push({
      kind: "WASH",
      title: "Tvätta",
      status: "TODO",
      required: true,
      requires: {}
    });
  }

  if (wantsStorageIn) {
    steps.push({
      kind: "STORE_WHEELS",
      title: "Lagra",
      status: "TODO",
      required: true,
      requires: {}
    });
  }

  if (ops.includes("STORAGE_OUT") && input.targetWheelStatus === "CHECKED_OUT") {
    steps.push({
      kind: "HANDOUT_WHEELS",
      title: "Lämna ut hjul",
      status: "TODO",
      required: true,
      requires: {}
    });
  }

  if (wantsQuote) {
    steps.push({
      kind: "CREATE_QUOTE",
      title: "Förbered offert",
      status: "TODO",
      required: false,
      requires: {}
    });
  }

  return steps;
}

export function buildWorkCard(input: {
  tireCase: Pick<TireLifecycleCase, "id" | "requestedOperations">;
  vehicle?: { registrationNumber?: string | null; make?: string | null; model?: string | null } | null;
  sourceWheelStatus: WheelPhysicalStatus;
  targetWheelStatus: WheelPhysicalStatus;
}): WorkCard {
  const steps = resolveWorkflow({
    intent: "MIXED",
    requestedOperations: input.tireCase.requestedOperations,
    sourceWheelStatus: input.sourceWheelStatus,
    targetWheelStatus: input.targetWheelStatus
  });

  const next = steps.find((s) => s.status === "TODO") ?? null;
  const headline =
    input.vehicle?.make && input.vehicle?.model && input.vehicle?.registrationNumber
      ? `${input.vehicle.make.toUpperCase()} ${input.vehicle.model.toUpperCase()} — ${input.vehicle.registrationNumber}`
      : input.vehicle?.registrationNumber
        ? `${input.vehicle.registrationNumber}`
        : `Ärende`;

  const summary = input.tireCase.requestedOperations.join(" + ").replaceAll("_", " ").toLowerCase();

  return {
    caseId: input.tireCase.id,
    headline,
    summary,
    nextBestAction: next ? { title: `Nästa: ${next.title}`, stepKind: next.kind } : null,
    steps
  };
}

