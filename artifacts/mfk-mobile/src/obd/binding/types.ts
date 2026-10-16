export type FingerprintAvailability = "ok" | "unavailable" | "malformed" | "unsupported" | "timeout";

export type VehicleFingerprint = {
  vinNormalized: string | null;
  vinAvailability: FingerprintAvailability;
  calibrationId: string | null;
  calibrationAvailability: FingerprintAvailability;
  cvn: string | null;
  cvnAvailability: FingerprintAvailability;
  ecuName: string | null;
  ecuNameAvailability: FingerprintAvailability;
  protocol: string | null;
  supportedPidsNormalized: string;
  ecuIdsNormalized: string;
  collectedAt: number;
  collectionError: string | null;
};

export type FingerprintMatchResult =
  | "VERIFIED"
  | "LIKELY_MATCH"
  | "INCONCLUSIVE"
  | "MISMATCH"
  | "UNSUPPORTED";

export type HardwareIdentityType = "unverified_hardware" | "cryptographic_hardware";

export const BINDING_COPY = {
  success: "تم ربط قطعة مفك بمركبتك بنجاح.",
  inconclusive: "تعذر التحقق من هوية المركبة حاليًا.",
  mismatch: "تم اكتشاف اختلاف في بيانات المركبة.",
  otherVehicle: "هذه القطعة مرتبطة بمركبة أخرى.",
  transferHint: "يمكنك طلب تغيير المركبة من إدارة الأجهزة.",
  unverifiedHardware:
    "هذه القطعة لا تملك هوية عتاد مشفّرة. الربط يعتمد على الحساب والبصمة المتاحة، وليس قفلًا ماديًا للجهاز.",
} as const;
