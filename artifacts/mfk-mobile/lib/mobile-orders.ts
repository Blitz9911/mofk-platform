import AsyncStorage from "@react-native-async-storage/async-storage";

const MOBILE_ORDERS_KEY = "mfk-mobile-orders";

export type MobilePaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type MobileOrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "device_assigned"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "waiting_activation"
  | "completed"
  | "cancelled";

export type MobileOrder = {
  id: string;
  orderNumber: string;
  planId: string;
  planName: string;
  billingCycle: "monthly" | "yearly";
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  paymentStatus: MobilePaymentStatus;
  orderStatus: MobileOrderStatus;
  subscriptionSar: number;
  deviceSar: number;
  shippingSar: number;
  vatSar: number;
  totalSar: number;
  deviceQuantity: number;
  trackingNumber?: string | null;
  shippingAddress: {
    city: string;
    district: string;
    street: string;
    buildingNumber: string;
    shortAddress: string;
    mapUrl: string;
    notes?: string;
  };
  internalNotes: string[];
  createdAt: string;
  updatedAt: string;
};

export const orderStatusMeta: Record<MobileOrderStatus, { label: string; description: string }> = {
  pending_payment: {
    label: "بانتظار الدفع",
    description: "تم إنشاء الطلب ولم يتم تأكيد الدفع.",
  },
  paid: {
    label: "مدفوع",
    description: "تم تأكيد الدفع.",
  },
  processing: {
    label: "قيد المعالجة",
    description: "فريق العمليات يجهز الطلب.",
  },
  device_assigned: {
    label: "تم تعيين الجهاز",
    description: "تم ربط جهاز بالطلب.",
  },
  ready_to_ship: {
    label: "جاهز للشحن",
    description: "الطلب جاهز للتسليم لشركة الشحن.",
  },
  shipped: {
    label: "تم الشحن",
    description: "الطلب في الطريق.",
  },
  delivered: {
    label: "تم التسليم",
    description: "وصل الجهاز للعميل.",
  },
  waiting_activation: {
    label: "بانتظار التفعيل",
    description: "يتبقى تفعيل الجهاز على المركبة.",
  },
  completed: {
    label: "مكتمل",
    description: "تم تفعيل الاشتراك والجهاز.",
  },
  cancelled: {
    label: "ملغي",
    description: "تم إلغاء الطلب.",
  },
};

export function formatOrderSar(value: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(value);
}

export async function listMobileOrders(): Promise<MobileOrder[]> {
  const raw = await AsyncStorage.getItem(MOBILE_ORDERS_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as MobileOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveMobileOrder(input: Omit<MobileOrder, "id" | "createdAt" | "updatedAt">): Promise<MobileOrder> {
  const orders = await listMobileOrders();
  const now = new Date().toISOString();
  const order: MobileOrder = {
    ...input,
    id: `ord-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };

  await AsyncStorage.setItem(MOBILE_ORDERS_KEY, JSON.stringify([order, ...orders]));
  return order;
}
