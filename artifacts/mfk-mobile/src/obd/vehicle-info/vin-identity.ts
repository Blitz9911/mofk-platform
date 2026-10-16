const WMI: Record<string, string> = {
  "1HG": "Honda",
  JHM: "Honda",
  "2HG": "Honda",
  "1G1": "Chevrolet",
  "1FT": "Ford",
  WVW: "Volkswagen",
  WBA: "BMW",
  WDD: "Mercedes-Benz",
  JT2: "Toyota",
  JTD: "Toyota",
  JTE: "Toyota",
  JTN: "Toyota",
  NMT: "Toyota",
  JTH: "Lexus",
  JT8: "Lexus",
  JTJ: "Lexus",
  JN1: "Nissan",
  KMH: "Hyundai",
  KM8: "Hyundai",
  "5NP": "Hyundai",
  KNA: "Kia",
};

export function vinMakerFamily(make: string | null | undefined): "toyota" | "hyundai" | "generic" {
  const value = (make ?? "").toLowerCase();
  if (value.includes("toyota") || value.includes("lexus")) return "toyota";
  if (value.includes("hyundai") || value.includes("kia")) return "hyundai";
  return "generic";
}

const YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789";

function yearFromCode(code: string) {
  const index = YEAR_CODES.indexOf(code.toUpperCase());
  if (index < 0) return null;
  return 2010 + index;
}

export function decodeVinIdentity(vin: string | null | undefined): {
  make: string | null;
  model: string | null;
  modelYear: number | null;
} {
  const value = (vin ?? "").trim().toUpperCase();
  if (value.length !== 17) {
    return { make: null, model: null, modelYear: null };
  }
  return {
    make: WMI[value.slice(0, 3)] ?? null,
    model: null,
    modelYear: yearFromCode(value[9] ?? ""),
  };
}
