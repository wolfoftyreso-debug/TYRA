import { describe, expect, it } from "vitest";

import { parseCommand } from "./command";

describe("parseCommand", () => {
  it("parses registration numbers", () => {
    expect(parseCommand("abc123")).toEqual({
      kind: "lookup_registration",
      registrationNumber: "ABC123"
    });
  });

  it("parses storage positions", () => {
    expect(parseCommand("A-04-B-12")).toEqual({
      kind: "lookup_storage_position",
      code: "A-04-B-12"
    });
  });

  it("parses wheel set codes", () => {
    expect(parseCommand("ws-7k2f")).toEqual({
      kind: "lookup_wheel_set_code",
      code: "WS-7K2F"
    });
  });

  it("parses navigation commands", () => {
    expect(parseCommand("plockkö")).toEqual({ kind: "navigate", to: "pick_queue" });
    expect(parseCommand("offerter")).toEqual({ kind: "navigate", to: "quotes_queue" });
  });

  it("parses deceased command", () => {
    expect(parseCommand("avliden abc123")).toEqual({
      kind: "mark_customer_deceased",
      registrationNumber: "ABC123"
    });
  });

  it("parses settings navigation", () => {
    expect(parseCommand("inställningar")).toEqual({ kind: "navigate", to: "settings" });
  });
});

