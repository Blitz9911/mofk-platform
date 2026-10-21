import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  smallint,
  numeric,
  boolean,
  timestamp,
  jsonb,
  date,
  index,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: text("password_hash"),
  city: varchar("city", { length: 60 }),
  language: varchar("language", { length: 2 }).notNull().default("ar"),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  subscriptionTier: varchar("subscription_tier", { length: 20 }).notNull().default("free"),
  subscriptionStartedAt: timestamp("subscription_started_at", { withTimezone: true }),
  subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
  subscriptionAutoRenew: boolean("subscription_auto_renew").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vehiclesTable = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    vin: varchar("vin", { length: 17 }),
    make: varchar("make", { length: 50 }).notNull(),
    model: varchar("model", { length: 80 }).notNull(),
    year: integer("year").notNull(),
    plateNumber: varchar("plate_number", { length: 20 }),
    nickname: varchar("nickname", { length: 60 }),
    odometerKm: integer("odometer_km").notNull().default(0),
    fuelType: varchar("fuel_type", { length: 20 }).notNull().default("petrol"),
    engineCc: integer("engine_cc"),
    adapterMac: varchar("adapter_mac", { length: 17 }),
    healthScore: smallint("health_score").notNull().default(100),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_vehicles_user").on(t.userId),
  }),
);

export const diagnosticSessionsTable = pgTable(
  "diagnostic_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSec: integer("duration_sec"),
    odometerKm: integer("odometer_km"),
    dtcCount: integer("dtc_count").notNull().default(0),
    healthBefore: smallint("health_before"),
    healthAfter: smallint("health_after"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    notes: text("notes"),
  },
  (t) => ({
    vehicleIdx: index("idx_sessions_vehicle").on(t.vehicleId, t.startedAt),
  }),
);

export const dtcCodesTable = pgTable(
  "dtc_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").references(() => diagnosticSessionsTable.id, {
      onDelete: "set null",
    }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 8 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    severity: varchar("severity", { length: 10 }).notNull().default("medium"),
    descriptionEn: text("description_en"),
    descriptionAr: text("description_ar"),
    possibleCauses: jsonb("possible_causes").$type<string[]>().notNull().default([]),
    estimatedCostMin: integer("estimated_cost_min"),
    estimatedCostMax: integer("estimated_cost_max"),
    recommendedAction: varchar("recommended_action", { length: 20 }),
    actionReasonAr: text("action_reason_ar"),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
  },
  (t) => ({
    vehicleIdx: index("idx_dtc_vehicle").on(t.vehicleId, t.detectedAt),
    codeIdx: index("idx_dtc_code").on(t.code),
  }),
);

export const telemetryTable = pgTable(
  "telemetry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    time: timestamp("time", { withTimezone: true }).notNull().defaultNow(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => diagnosticSessionsTable.id, {
      onDelete: "set null",
    }),
    rpm: integer("rpm"),
    speedKmh: integer("speed_kmh"),
    coolantTemp: smallint("coolant_temp"),
    intakeTemp: smallint("intake_temp"),
    batteryV: numeric("battery_v", { precision: 4, scale: 2 }),
    fuelLevelPct: smallint("fuel_level_pct"),
    engineLoad: smallint("engine_load"),
    throttlePos: smallint("throttle_pos"),
  },
  (t) => ({
    vehicleTimeIdx: index("idx_telemetry_vehicle_time").on(t.vehicleId, t.time),
  }),
);

export const maintenanceTable = pgTable(
  "maintenance_schedule",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    serviceType: varchar("service_type", { length: 50 }).notNull(),
    serviceTypeAr: varchar("service_type_ar", { length: 100 }).notNull(),
    intervalKm: integer("interval_km"),
    intervalDays: integer("interval_days"),
    lastDoneKm: integer("last_done_km"),
    lastDoneAt: timestamp("last_done_at", { withTimezone: true }),
    nextDueKm: integer("next_due_km"),
    nextDueAt: timestamp("next_due_at", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull().default("scheduled"),
    estimatedCost: integer("estimated_cost"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
  },
  (t) => ({
    vehicleIdx: index("idx_maint_vehicle").on(t.vehicleId, t.nextDueAt),
  }),
);

export const recommendationsTable = pgTable(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 30 }).notNull(),
    severity: varchar("severity", { length: 10 }).notNull().default("info"),
    titleAr: varchar("title_ar", { length: 200 }).notNull(),
    descriptionAr: text("description_ar").notNull(),
    confidencePct: smallint("confidence_pct").notNull().default(80),
    suggestedAction: varchar("suggested_action", { length: 50 }),
    suggestedCostSar: integer("suggested_cost_sar"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    vehicleIdx: index("idx_recs_vehicle").on(t.vehicleId, t.createdAt),
  }),
);

export const healthHistoryTable = pgTable(
  "health_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    score: smallint("score").notNull(),
  },
  (t) => ({
    vehicleDateIdx: index("idx_health_vehicle_date").on(t.vehicleId, t.date),
  }),
);

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: varchar("id", { length: 30 }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  nameAr: varchar("name_ar", { length: 50 }).notNull(),
  descriptionAr: text("description_ar").notNull(),
  priceMonthlySar: integer("price_monthly_sar").notNull(),
  priceYearlySar: integer("price_yearly_sar").notNull(),
  devicePriceSar: integer("device_price_sar").notNull().default(0),
  tier: varchar("tier", { length: 20 }).notNull(),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  featuresAr: jsonb("features_ar").$type<string[]>().notNull().default([]),
  isPopular: boolean("is_popular").notNull().default(false),
  sortOrder: smallint("sort_order").notNull().default(0),
});

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    planId: varchar("plan_id", { length: 30 }).notNull().references(() => subscriptionPlansTable.id),
    billingCycle: varchar("billing_cycle", { length: 12 }).notNull().default("monthly"),
    status: varchar("status", { length: 20 }).notNull().default("inactive"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_subscriptions_user").on(t.userId),
    planIdx: index("idx_subscriptions_plan").on(t.planId),
  }),
);

export const ordersTable = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    planId: varchar("plan_id", { length: 30 }).notNull().references(() => subscriptionPlansTable.id),
    billingCycle: varchar("billing_cycle", { length: 12 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("created"),
    subtotal: integer("subtotal").notNull().default(0),
    vat: integer("vat").notNull().default(0),
    total: integer("total").notNull().default(0),
    shippingAddress: jsonb("shipping_address").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_orders_user").on(t.userId, t.createdAt),
    statusIdx: index("idx_orders_status").on(t.status),
  }),
);

export const orderItemsTable = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
  },
  (t) => ({
    orderIdx: index("idx_order_items_order").on(t.orderId),
  }),
);

export const paymentsTable = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
    moyasarPaymentId: varchar("moyasar_payment_id", { length: 120 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    amount: integer("amount").notNull(),
    rawWebhook: jsonb("raw_webhook").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("idx_payments_order").on(t.orderId),
    moyasarIdx: index("idx_payments_moyasar_id").on(t.moyasarPaymentId),
  }),
);

export const shipmentsTable = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
    carrier: varchar("carrier", { length: 80 }).notNull().default("Manual"),
    trackingNumber: varchar("tracking_number", { length: 120 }),
    status: varchar("status", { length: 20 }).notNull().default("preparing"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("idx_shipments_order").on(t.orderId),
  }),
);

export const devicesTable = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serial: varchar("serial", { length: 80 }).notNull().unique(),
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptionsTable.id, { onDelete: "set null" }),
    status: varchar("status", { length: 20 }).notNull().default("shipped"),
    pairedAt: timestamp("paired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_devices_user").on(t.userId),
    subscriptionIdx: index("idx_devices_subscription").on(t.subscriptionId),
  }),
);

export const fleetAccountsTable = pgTable(
  "fleet_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyName: varchar("company_name", { length: 160 }).notNull(),
    contact: jsonb("contact").$type<Record<string, unknown>>().notNull().default({}),
    vehiclesCount: integer("vehicles_count").notNull().default(5),
    status: varchar("status", { length: 20 }).notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("idx_fleet_accounts_status").on(t.status),
  }),
);

export const activityTable = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehiclesTable.id, {
      onDelete: "set null",
    }),
    kind: varchar("kind", { length: 40 }).notNull(),
    titleAr: varchar("title_ar", { length: 200 }).notNull(),
    subtitleAr: text("subtitle_ar"),
    severity: varchar("severity", { length: 10 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_activity_user").on(t.userId, t.occurredAt),
  }),
);

export const fuelLogsTable = pgTable(
  "fuel_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    filledAt: timestamp("filled_at", { withTimezone: true }).notNull().defaultNow(),
    odometerKm: integer("odometer_km").notNull(),
    liters: numeric("liters", { precision: 6, scale: 2 }).notNull(),
    pricePerLiterHalalas: integer("price_per_liter_halalas").notNull(), // stored in halalas (1/100 SAR) to avoid float issues
    totalCostHalalas: integer("total_cost_halalas").notNull(),
    fuelGrade: varchar("fuel_grade", { length: 10 }).notNull().default("91"), // 91, 95, diesel
    stationNameAr: varchar("station_name_ar", { length: 120 }),
    isFull: boolean("is_full").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    vehicleIdx: index("idx_fuel_vehicle_filled").on(t.vehicleId, t.filledAt),
    userIdx: index("idx_fuel_user").on(t.userId, t.filledAt),
  }),
);

export const revenueTable = pgTable("revenue_monthly", {
  id: uuid("id").primaryKey().defaultRandom(),
  month: varchar("month", { length: 7 }).notNull().unique(),
  subscriptionRevenue: integer("subscription_revenue").notNull().default(0),
  commissionRevenue: integer("commission_revenue").notNull().default(0),
  newSubscribers: integer("new_subscribers").notNull().default(0),
});
