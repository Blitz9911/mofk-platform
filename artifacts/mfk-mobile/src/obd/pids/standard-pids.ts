export type StandardPidDefinition = {
  pid: string;
  command: string;
  label: string;
  unit: string | null;
  minBytes: number;
};

export const STANDARD_MODE_01_PIDS: StandardPidDefinition[] = [
  { pid: "0104", command: "0104", label: "حمل المحرك", unit: "%", minBytes: 1 },
  { pid: "0105", command: "0105", label: "حرارة سائل التبريد", unit: "°م", minBytes: 1 },
  { pid: "0106", command: "0106", label: "تصحيح الوقود قصير المدى B1", unit: "%", minBytes: 1 },
  { pid: "0107", command: "0107", label: "تصحيح الوقود طويل المدى B1", unit: "%", minBytes: 1 },
  { pid: "010B", command: "010B", label: "ضغط مجمع السحب", unit: "kPa", minBytes: 1 },
  { pid: "010C", command: "010C", label: "RPM", unit: "RPM", minBytes: 2 },
  { pid: "010D", command: "010D", label: "السرعة", unit: "كم/س", minBytes: 1 },
  { pid: "010E", command: "010E", label: "تقديم التوقيت", unit: "°", minBytes: 1 },
  { pid: "010F", command: "010F", label: "حرارة هواء السحب", unit: "°م", minBytes: 1 },
  { pid: "0110", command: "0110", label: "كتلة تدفق الهواء", unit: "g/s", minBytes: 2 },
  { pid: "0111", command: "0111", label: "موضع الخانق", unit: "%", minBytes: 1 },
  { pid: "012F", command: "012F", label: "مستوى الوقود", unit: "%", minBytes: 1 },
  { pid: "0142", command: "0142", label: "فولتية وحدة التحكم", unit: "V", minBytes: 2 },
  { pid: "0146", command: "0146", label: "حرارة الهواء المحيط", unit: "°م", minBytes: 1 },
  { pid: "015E", command: "015E", label: "معدل استهلاك الوقود", unit: "L/h", minBytes: 2 },
];

export const LIVE_POLLING_PIDS = {
  fast: ["010C", "010D"],
  normal: ["0104", "0111"],
  slow: ["0105", "012F", "0142"],
} as const;
