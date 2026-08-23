import { describe, expect, it } from "vitest";

import { buildCustomerCard } from "./crm";

describe("CRM engine: buildCustomerCard", () => {
  it("suggests prepare quote when there is an open opportunity", () => {
    const card = buildCustomerCard({
      customer: { id: "c1", name: "Erik Svensson" },
      vehicles: [
        {
          id: "v1",
          registrationNumber: "DEF456",
          make: "BMW",
          model: "X5",
          modelYear: 2021
        }
      ],
      wheelSets: [
        {
          id: "ws1",
          vehicleId: "v1",
          season: "winter",
          status: "PICK_REQUESTED",
          storageStatus: "STORED",
          storageCode: "A-04-B-12",
          publicCode: "WS-7K2F"
        }
      ],
      opportunities: [
        {
          id: "o1",
          wheelSetId: "ws1",
          status: "open",
          reason: "replacement_recommended"
        }
      ]
    });

    expect(card.counts.openOpportunities).toBe(1);
    expect(card.nextAction).toEqual({ kind: "prepare_quote", label: "Förbered offert" });
  });

  it("suggests pick when there is no open opportunity but pick is needed", () => {
    const card = buildCustomerCard({
      customer: { id: "c1", name: "Erik Svensson" },
      vehicles: [{ id: "v1", registrationNumber: "DEF456" }],
      wheelSets: [
        {
          id: "ws1",
          vehicleId: "v1",
          season: "winter",
          status: "PICK_REQUESTED",
          storageStatus: "STORED"
        }
      ],
      opportunities: []
    });

    expect(card.nextAction.kind).toBe("pick");
  });

  it("suggests none when everything looks fine", () => {
    const card = buildCustomerCard({
      customer: { id: "c1", name: "Anna Andersson" },
      vehicles: [{ id: "v1", registrationNumber: "ABC123", make: "Volvo", model: "XC60" }],
      wheelSets: [
        {
          id: "ws-w",
          vehicleId: "v1",
          season: "winter",
          status: "PICKED",
          storageStatus: "IN_WORKSHOP"
        },
        {
          id: "ws-s",
          vehicleId: "v1",
          season: "summer",
          status: "MOUNTED",
          storageStatus: "ON_VEHICLE"
        }
      ],
      opportunities: []
    });

    expect(card.counts.vehicles).toBe(1);
    expect(card.counts.wheelSets).toBe(2);
    expect(card.nextAction.kind).toBe("none");
  });
});

