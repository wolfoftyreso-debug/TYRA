export type CanonicalOperation =
  | "STORAGE_IN"
  | "STORAGE_OUT"
  | "STORAGE_CONTINUE"
  | "STORAGE_TERMINATE"
  | "STORAGE_TRANSFER_IN"
  | "STORAGE_TRANSFER_OUT"
  | "TIRE_SWAP"
  | "TIRE_SWAP_FROM_STORAGE"
  | "TIRE_SWAP_TO_STORAGE"
  | "NEW_CUSTOMER_SWAP_AND_STORE"
  | "EXISTING_CUSTOMER_SWAP_AND_STORE"
  | "CUSTOMER_CARRIED_WHEELS_SWAP"
  | "WHEEL_WASH"
  | "WHEEL_BALANCE"
  | "WHEEL_INSPECTION"
  | "WHEEL_REPAIR"
  | "RIM_REPAIR"
  | "VALVE_SERVICE"
  | "TPMS_SERVICE"
  | "WHEEL_PACKING"
  | "WHEEL_DISPOSAL"
  | "TIRE_REPLACEMENT_REQUIRED"
  | "TIRE_REPLACEMENT_RECOMMENDED"
  | "TIRE_QUOTE"
  | "TIRE_ORDER"
  | "TIRE_INSTALLATION"
  | "TIRE_DISPOSAL";

export type DmsCapabilities = {
  supportsReadOrders: boolean;
  supportsWriteOrders: boolean;
  supportsAddOrderLine: boolean;
  supportsUpdateBooking: boolean;
  supportsCustomerLookup: boolean;
  supportsVehicleLookup: boolean;
  supportsPricing: boolean;
  supportsInvoiceStatus: boolean;
};

export type DmsExternalEvent = {
  sourceSystem: string; // e.g. "DMS_A"
  externalEventId: string; // idempotency key
  externalOrderId?: string | null;
  externalBookingId?: string | null;
  externalLineId?: string | null;
  occurredAt: string; // ISO
  payload: unknown;
};

export type DmsCodeMapping = {
  sourceSystem: string;
  dmsCode: string;
  mappingVersion: number;
  canonicalOperation: CanonicalOperation;
  description?: string | null;
  active: boolean;
};

