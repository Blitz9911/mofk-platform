export const maintenanceServiceLabels: Record<string, string> = {
  oil_change: "تغيير زيت المحرك",
  tire_rotation: "تبديل مواقع الإطارات",
  brake_inspection: "فحص الفرامل",
  battery_check: "فحص البطارية",
  air_filter: "تغيير فلتر الهواء",
  transmission_fluid: "تغيير زيت ناقل الحركة (القير)",
  coolant_flush: "تغيير سائل التبريد",
  spark_plugs: "تغيير شمعات الإشعال (البواجي)",
  timing_belt: "فحص أو تغيير سير التوقيت",
  wheel_alignment: "ضبط زوايا العجلات",
  ac_service: "صيانة التكييف",
  other: "صيانة أخرى",
};

export const maintenanceRules: Record<
  string,
  {
    intervalKm?: number;
    intervalDays?: number;
    soonKm?: number;
    soonDays?: number;
    estimatedCostSar?: number;
  }
> = {
  oil_change: { intervalKm: 10000, intervalDays: 180, soonKm: 1500, soonDays: 30, estimatedCostSar: 250 },
  tire_rotation: { intervalKm: 10000, intervalDays: 180, soonKm: 1500, soonDays: 30, estimatedCostSar: 120 },
  brake_inspection: { intervalKm: 20000, intervalDays: 365, soonKm: 2500, soonDays: 45, estimatedCostSar: 180 },
  battery_check: { intervalDays: 365, soonDays: 45, estimatedCostSar: 80 },
  air_filter: { intervalKm: 15000, intervalDays: 365, soonKm: 2000, soonDays: 45, estimatedCostSar: 90 },
  transmission_fluid: { intervalKm: 60000, intervalDays: 1095, soonKm: 5000, soonDays: 60, estimatedCostSar: 450 },
  coolant_flush: { intervalKm: 40000, intervalDays: 730, soonKm: 4000, soonDays: 60, estimatedCostSar: 250 },
  spark_plugs: { intervalKm: 40000, intervalDays: 730, soonKm: 4000, soonDays: 60, estimatedCostSar: 300 },
  timing_belt: { intervalKm: 100000, intervalDays: 1825, soonKm: 8000, soonDays: 90, estimatedCostSar: 900 },
  wheel_alignment: { intervalKm: 20000, intervalDays: 365, soonKm: 2500, soonDays: 45, estimatedCostSar: 180 },
  ac_service: { intervalDays: 365, soonDays: 45, estimatedCostSar: 220 },
};
