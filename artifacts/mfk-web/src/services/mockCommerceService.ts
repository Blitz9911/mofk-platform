import {
  BillingCycle,
  PlanConfig,
  PlanId,
  formatSar,
  getPlanById,
  getPlanPrice,
  plans,
} from "@/config/plans";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus =
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
export type DeviceStatus =
  | "available"
  | "reserved"
  | "assigned"
  | "shipped"
  | "activated"
  | "defective";
export type SubscriptionStatus =
  | "pending_activation"
  | "active"
  | "expired"
  | "cancelled";
export type FleetAccountStatus =
  | "sales_review"
  | "quote_pending"
  | "approved"
  | "setup"
  | "active";

export type CustomerInfo = {
  fullName: string;
  phone: string;
  email: string;
};

export type ShippingAddress = {
  city: string;
  district: string;
  street: string;
  buildingNumber: string;
  postalCode: string;
  additionalNumber: string;
  notes?: string;
};

export type MockOrder = {
  id: string;
  orderNumber: string;
  planId: PlanId;
  billingCycle: BillingCycle;
  customer: CustomerInfo;
  shippingAddress: ShippingAddress;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  amountSar: number;
  vatSar: number;
  shippingSar: number;
  totalSar: number;
  deviceQuantity: number;
  assignedEmployee?: string;
  assignedDeviceSerial?: string;
  trackingNumber?: string;
  internalNotes: string[];
  createdAt: string;
  updatedAt: string;
};

export type MockDevice = {
  serialNumber: string;
  macAddress: string;
  batch: string;
  status: DeviceStatus;
  assignedOrderId?: string;
  assignedCustomer?: string;
  assignedVehicle?: string;
  activationState: "not_started" | "validated" | "linked";
};

export type MockSubscription = {
  id: string;
  customer: string;
  planId: PlanId;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  activationState: "not_required" | "waiting_device" | "active";
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  linkedDevice?: string;
};

export type FleetInquiry = {
  id: string;
  companyName: string;
  contactPerson: string;
  workEmail: string;
  phone: string;
  vehicleCount: number;
  userCount: number;
  commercialRegistration?: string;
  taxNumber?: string;
  notes?: string;
  status: FleetAccountStatus;
  createdAt: string;
};

const ORDERS_KEY = "mfk-commerce-orders";
const DEVICES_KEY = "mfk-commerce-devices";
const SUBSCRIPTIONS_KEY = "mfk-commerce-subscriptions";
const FLEET_KEY = "mfk-commerce-fleet";

function now() {
  return new Date().toISOString();
}

function readStore<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function defaultDevices(): MockDevice[] {
  return Array.from({ length: 12 }, (_, index) => {
    const padded = `${index + 1}`.padStart(4, "0");
    return {
      serialNumber: `MFK-${padded}`,
      macAddress: `A4:C1:38:2${index}:9A:${padded.slice(2)}`,
      batch: index < 6 ? "B-2026-07" : "B-2026-08",
      status: index < 2 ? "reserved" : "available",
      assignedOrderId: index === 0 ? "ord-demo-001" : undefined,
      assignedCustomer: index === 0 ? "عميل تجريبي" : undefined,
      assignedVehicle: index === 0 ? "Toyota Camry" : undefined,
      activationState: index === 0 ? "linked" : "not_started",
    };
  });
}

function defaultSubscriptions(): MockSubscription[] {
  return [
    {
      id: "sub-demo-001",
      customer: "عميل تجريبي",
      planId: "plus",
      cycle: "annual",
      status: "pending_activation",
      activationState: "waiting_device",
      startDate: now().slice(0, 10),
      endDate: "2027-07-18",
      autoRenew: true,
      linkedDevice: "MFK-0001",
    },
  ];
}

export const commerceService = {
  getPlans: () => plans,
  getPlanById,

  createMockOrder(input: {
    plan: PlanConfig;
    billingCycle: BillingCycle;
    customer: CustomerInfo;
    shippingAddress: ShippingAddress;
  }) {
    const orders = readStore<MockOrder[]>(ORDERS_KEY, []);
    const subscriptionAmount = getPlanPrice(input.plan, input.billingCycle) ?? 0;
    const deviceAmount = input.plan.includesDevice ? input.plan.devicePriceSar : 0;
    const amount = subscriptionAmount + deviceAmount;
    const shippingSar = 0;
    const vatSar = Math.round(amount * 0.15);
    const totalSar = amount + vatSar + shippingSar;
    const id = `ord-${Date.now()}`;
    const order: MockOrder = {
      id,
      orderNumber: `MFK-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, "0")}`,
      planId: input.plan.id,
      billingCycle: input.billingCycle,
      customer: input.customer,
      shippingAddress: input.shippingAddress,
      paymentStatus: "pending",
      orderStatus: "pending_payment",
      amountSar: amount,
      vatSar,
      shippingSar,
      totalSar,
      deviceQuantity: input.plan.includesDevice ? 1 : 0,
      internalNotes: [],
      createdAt: now(),
      updatedAt: now(),
    };
    writeStore(ORDERS_KEY, [order, ...orders]);
    return order;
  },

  getOrders() {
    return readStore<MockOrder[]>(ORDERS_KEY, []);
  },

  getMockOrder(orderId?: string) {
    return this.getOrders().find((order) => order.id === orderId) ?? null;
  },

  updateMockOrder(orderId: string, patch: Partial<MockOrder>) {
    const orders = this.getOrders();
    const next = orders.map((order) =>
      order.id === orderId ? { ...order, ...patch, updatedAt: now() } : order,
    );
    writeStore(ORDERS_KEY, next);
    return next.find((order) => order.id === orderId) ?? null;
  },

  markPayment(orderId: string, status: PaymentStatus) {
    const orderStatus: OrderStatus =
      status === "paid" ? "processing" : status === "failed" ? "pending_payment" : "pending_payment";
    return this.updateMockOrder(orderId, { paymentStatus: status, orderStatus });
  },

  getDevices() {
    const devices = readStore<MockDevice[]>(DEVICES_KEY, []);
    if (devices.length) return devices;
    const defaults = defaultDevices();
    writeStore(DEVICES_KEY, defaults);
    return defaults;
  },

  updateDevice(serialNumber: string, patch: Partial<MockDevice>) {
    const devices = this.getDevices();
    const next = devices.map((device) =>
      device.serialNumber === serialNumber ? { ...device, ...patch } : device,
    );
    writeStore(DEVICES_KEY, next);
    return next.find((device) => device.serialNumber === serialNumber) ?? null;
  },

  getSubscriptions() {
    const subs = readStore<MockSubscription[]>(SUBSCRIPTIONS_KEY, []);
    if (subs.length) return subs;
    const defaults = defaultSubscriptions();
    writeStore(SUBSCRIPTIONS_KEY, defaults);
    return defaults;
  },

  activateMockDevice(input: {
    serialNumber: string;
    activationCode: string;
    vehicleName: string;
    orderId?: string;
  }) {
    const device = this.updateDevice(input.serialNumber, {
      status: "activated",
      assignedVehicle: input.vehicleName,
      activationState: "linked",
    });

    if (input.orderId) {
      this.updateMockOrder(input.orderId, {
        orderStatus: "completed",
        assignedDeviceSerial: input.serialNumber,
      });
    }

    const subscriptions = this.getSubscriptions();
    writeStore(
      SUBSCRIPTIONS_KEY,
      subscriptions.map((sub) =>
        sub.linkedDevice === input.serialNumber || sub.status === "pending_activation"
          ? { ...sub, status: "active", activationState: "active", linkedDevice: input.serialNumber }
          : sub,
      ),
    );

    return device;
  },

  submitFleetInquiry(input: Omit<FleetInquiry, "id" | "status" | "createdAt">) {
    const inquiries = readStore<FleetInquiry[]>(FLEET_KEY, []);
    const inquiry: FleetInquiry = {
      ...input,
      id: `FLT-${Date.now().toString().slice(-6)}`,
      status: "sales_review",
      createdAt: now(),
    };
    writeStore(FLEET_KEY, [inquiry, ...inquiries]);
    return inquiry;
  },

  getFleetAccounts() {
    return readStore<FleetInquiry[]>(FLEET_KEY, []);
  },

  describeOrderAmount(order: MockOrder) {
    return `${formatSar(order.totalSar)} ر.س`;
  },
};
