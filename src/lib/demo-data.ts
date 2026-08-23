import {
  buildPackageLines,
  packageTotal,
  type QuoteLine,
  type QuoteSlot,
  type TyreProduct,
} from "@/lib/domain/quote";
import type { WheelSetStatus } from "@/lib/domain/status";

export interface WheelSet {
  id: string;
  season: "Sommar" | "Vinter";
  status: WheelSetStatus;
  tyre: string;
  dimension: string;
  tread: number[];
  location?: string;
  replacementRecommended?: boolean;
}

export interface Vehicle {
  registration: string;
  make: string;
  model: string;
  year: number;
  customerId: string;
  wheelSets: WheelSet[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export const organization = {
  id: "org_werkstad_tyreso",
  name: "Werkstad Tyresö",
  temperature: 17.4,
  humidity: 42,
};

export const customers: Customer[] = [
  { id: "anna", name: "Anna Andersson", phone: "070-123 45 67", email: "anna@example.se" },
  { id: "erik", name: "Erik Eriksson", phone: "070-234 56 78", email: "erik@example.se" },
  { id: "maria", name: "Maria Lind", phone: "070-345 67 89", email: "maria@example.se" },
  { id: "lisa", name: "Lisa Berg", phone: "070-456 78 90", email: "lisa@example.se" },
];

export const vehicles: Vehicle[] = [
  {
    registration: "ABC123",
    make: "Volvo",
    model: "XC60",
    year: 2022,
    customerId: "anna",
    wheelSets: [
      {
        id: "abc-winter",
        season: "Vinter",
        status: "PICKED",
        tyre: "Michelin X-Ice",
        dimension: "235/55 R19",
        tread: [6.2, 6.1, 5.8, 5.9],
        location: "A-04-B-12",
      },
      {
        id: "abc-summer",
        season: "Sommar",
        status: "MOUNTED",
        tyre: "Michelin Pilot Sport 4",
        dimension: "235/55 R19",
        tread: [3.6, 3.4, 3.8, 3.5],
        replacementRecommended: true,
      },
    ],
  },
  {
    registration: "DEF456",
    make: "BMW",
    model: "X5",
    year: 2021,
    customerId: "erik",
    wheelSets: [
      {
        id: "def-winter",
        season: "Vinter",
        status: "PICK_REQUESTED",
        tyre: "Nokian Hakkapeliitta R5",
        dimension: "275/40 R20",
        tread: [3.2, 3.5, 3.4, 3.1],
        location: "A-03-A-08",
        replacementRecommended: true,
      },
      {
        id: "def-summer",
        season: "Sommar",
        status: "MOUNTED",
        tyre: "Pirelli P Zero",
        dimension: "275/40 R20",
        tread: [5.4, 5.2, 5.5, 5.3],
      },
    ],
  },
  {
    registration: "KLM789",
    make: "Volkswagen",
    model: "Passat",
    year: 2019,
    customerId: "maria",
    wheelSets: [
      {
        id: "klm-winter",
        season: "Vinter",
        status: "CHECKING_IN",
        tyre: "Continental VikingContact",
        dimension: "215/55 R17",
        tread: [6.8, 6.6, 6.7, 6.5],
      },
    ],
  },
  {
    registration: "MNO321",
    make: "Audi",
    model: "A4",
    year: 2020,
    customerId: "lisa",
    wheelSets: [],
  },
];

export const tyreProducts: TyreProduct[] = [
  {
    id: "michelin-ps5-235",
    brand: "Michelin",
    model: "Pilot Sport 5",
    width: 235,
    profile: 55,
    rim: 19,
    loadIndex: 105,
    speedRating: "W",
    season: "summer",
    segment: "premium",
    unitPriceOre: 249500,
    costPriceOre: 170000,
    stock: 12,
    active: true,
    xl: true,
    evApproved: true,
    eprelUrl: "https://eprel.ec.europa.eu/",
  },
  {
    id: "goodyear-f1-235",
    brand: "Goodyear",
    model: "Eagle F1 Asymmetric 6",
    width: 235,
    profile: 55,
    rim: 19,
    loadIndex: 105,
    speedRating: "W",
    season: "summer",
    segment: "premium",
    unitPriceOre: 229500,
    costPriceOre: 158000,
    stock: 8,
    active: true,
    xl: true,
    evApproved: true,
  },
  {
    id: "hankook-ventus-235",
    brand: "Hankook",
    model: "Ventus S1 evo3",
    width: 235,
    profile: 55,
    rim: 19,
    loadIndex: 105,
    speedRating: "W",
    season: "summer",
    segment: "value",
    unitPriceOre: 189500,
    costPriceOre: 128000,
    stock: 16,
    active: true,
    xl: true,
    evApproved: true,
  },
];

function option(
  id: string,
  slot: QuoteSlot,
  product: TyreProduct,
  title: string,
  rationale: string,
) {
  const lines = buildPackageLines(product, {
    mountingOre: 40000,
    recyclingOre: 4000,
  });
  return { id, slot, product, title, rationale, lines, totalOre: packageTotal(lines) };
}

export const demoQuote = {
  id: "quote-xc60-summer",
  token: "demo-xc60-offert",
  status: "ready" as const,
  customer: customers[0],
  vehicle: vehicles[0],
  validUntil: "2026-09-06",
  options: [
    option(
      "q1",
      "recommended",
      tyreProducts[0],
      "Vårt val",
      "Samma märke som idag, rätt för bilens premiumsegment och tillgängligt i lager.",
    ),
    option(
      "q2",
      "alternative",
      tyreProducts[1],
      "Alternativ",
      "Premiumalternativ med rätt belastnings- och hastighetsindex till ett lägre paketpris.",
    ),
    option(
      "q3",
      "value",
      tyreProducts[2],
      "Mest för pengarna",
      "Godkänd passform och specifikation med lägst totalkostnad i urvalet.",
    ),
  ] satisfies Array<{
    id: string;
    slot: QuoteSlot;
    product: TyreProduct;
    title: string;
    rationale: string;
    lines: QuoteLine[];
    totalOre: number;
  }>,
};

export function getCustomer(id: string) {
  return customers.find((customer) => customer.id === id);
}

export function getVehicle(registration: string) {
  return vehicles.find(
    (vehicle) => vehicle.registration === registration.toUpperCase(),
  );
}

export function formatSek(ore: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(ore / 100);
}
