import { isOcrEnabled } from "../lib/health-intelligence-flags";

export type InvoiceExtract = {
  available: boolean;
  fields: {
    date?: string | null;
    workshopName?: string | null;
    totalSar?: number | null;
    odometerKm?: number | null;
  } | null;
  reason?: string;
};

/** Never invents OCR results. Disabled unless MFK_OCR_ENABLED is set and a provider exists. */
export async function extractInvoiceFromImage(_input?: {
  mimeType?: string;
  byteLength?: number;
}): Promise<InvoiceExtract> {
  if (!isOcrEnabled()) {
    return { available: false, fields: null, reason: "ocr_disabled" };
  }
  return { available: false, fields: null, reason: "ocr_provider_not_configured" };
}
