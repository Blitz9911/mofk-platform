import { sql } from "drizzle-orm";
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
  uniqueIndex,
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
    suggestedAction: varchar("suggested_action", { length: 200 }),
    suggestedCostSar: integer("suggested_cost_sar"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    source: varchar("source", { length: 40 }),
    sourceKey: varchar("source_key", { length: 80 }),
    category: varchar("category", { length: 20 }),
    serviceType: varchar("service_type", { length: 50 }),
    linkedMaintenanceItemId: uuid("linked_maintenance_item_id"),
    linkedMaintenanceLogId: uuid("linked_maintenance_log_id"),
    deferredUntil: timestamp("deferred_until", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => ({
    vehicleIdx: index("idx_recs_vehicle").on(t.vehicleId, t.createdAt),
    sourceIdx: index("idx_recs_source_key").on(t.vehicleId, t.sourceKey),
  }),
);

export const maintenanceLogsTable = pgTable(
  "maintenance_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    serviceType: varchar("service_type", { length: 50 }).notNull(),
    serviceTypeAr: varchar("service_type_ar", { length: 100 }),
    customServiceName: varchar("custom_service_name", { length: 120 }),
    doneAt: timestamp("done_at", { withTimezone: true }).notNull(),
    doneAtKm: integer("done_at_km"),
    costSar: integer("cost_sar"),
    notes: text("notes"),
    source: varchar("source", { length: 30 }).notNull().default("manual"),
    recommendationId: uuid("recommendation_id"),
    idempotencyKey: varchar("idempotency_key", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    vehicleIdx: index("idx_maint_logs_vehicle").on(t.vehicleId, t.doneAt),
    userIdx: index("idx_maint_logs_user").on(t.userId, t.doneAt),
  }),
);

export const recommendationEventsTable = pgTable(
  "recommendation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => recommendationsTable.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 40 }).notNull(),
    fromStatus: varchar("from_status", { length: 20 }),
    toStatus: varchar("to_status", { length: 20 }),
    note: text("note"),
    maintenanceLogId: uuid("maintenance_log_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    recIdx: index("idx_rec_events_rec").on(t.recommendationId, t.createdAt),
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

/** History remains `maintenance_logs`. These tables extend it without replacing it. */
export const maintenanceLogItemsTable = pgTable(
  "maintenance_log_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    logId: uuid("log_id")
      .notNull()
      .references(() => maintenanceLogsTable.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 20 }).notNull().default("part"),
    nameAr: varchar("name_ar", { length: 120 }).notNull(),
    brand: varchar("brand", { length: 80 }),
    quantity: integer("quantity").notNull().default(1),
    unitCostSar: integer("unit_cost_sar"),
    oilType: varchar("oil_type", { length: 40 }),
    oilViscosity: varchar("oil_viscosity", { length: 20 }),
  },
  (t) => ({
    logIdx: index("idx_maint_log_items_log").on(t.logId),
  }),
);

export const maintenanceAttachmentsTable = pgTable(
  "maintenance_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    logId: uuid("log_id")
      .notNull()
      .references(() => maintenanceLogsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    mimeType: varchar("mime_type", { length: 80 }),
    kind: varchar("kind", { length: 20 }).notNull().default("invoice"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    logIdx: index("idx_maint_attachments_log").on(t.logId),
    userIdx: index("idx_maint_attachments_user").on(t.userId),
  }),
);

export const maintenanceRulesTable = pgTable(
  "maintenance_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id").references(() => vehiclesTable.id, { onDelete: "cascade" }),
    make: varchar("make", { length: 50 }),
    model: varchar("model", { length: 80 }),
    year: integer("year"),
    engine: varchar("engine", { length: 40 }),
    serviceType: varchar("service_type", { length: 50 }).notNull(),
    intervalKm: integer("interval_km"),
    intervalDays: integer("interval_days"),
    soonKm: integer("soon_km"),
    soonDays: integer("soon_days"),
    estimatedCost: integer("estimated_cost"),
    ruleSource: varchar("rule_source", { length: 30 }).notNull().default("user_configured"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    vehicleIdx: index("idx_maint_rules_vehicle").on(t.vehicleId, t.serviceType),
  }),
);

export const maintenanceApprovalRequestsTable = pgTable(
  "maintenance_approval_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 30 }).notNull().default("dtc_cleared"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    titleAr: varchar("title_ar", { length: 200 }).notNull(),
    bodyAr: text("body_ar").notNull(),
    dtcCode: varchar("dtc_code", { length: 8 }),
    reminderAt: timestamp("reminder_at", { withTimezone: true }),
    resolvedLogId: uuid("resolved_log_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    vehicleIdx: index("idx_maint_approvals_vehicle").on(t.vehicleId, t.status),
  }),
);

export const odometerReadingsTable = pgTable(
  "odometer_readings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    km: integer("km").notNull(),
    source: varchar("source", { length: 30 }).notNull().default("manual"),
    estimated: boolean("estimated").notNull().default(false),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    vehicleIdx: index("idx_odometer_vehicle").on(t.vehicleId, t.recordedAt),
  }),
);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehiclesTable.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).notNull(),
    severity: varchar("severity", { length: 10 }).notNull().default("info"),
    titleAr: varchar("title_ar", { length: 200 }).notNull(),
    bodyAr: text("body_ar"),
    actionUrl: varchar("action_url", { length: 200 }),
    dedupeKey: varchar("dedupe_key", { length: 160 }),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_notifications_user").on(t.userId, t.createdAt),
    dedupeIdx: index("idx_notifications_dedupe").on(t.userId, t.dedupeKey),
    activeDedupe: uniqueIndex("idx_notifications_active_dedupe")
      .on(t.userId, t.dedupeKey)
      .where(sql`${t.dedupeKey} is not null and ${t.supersededAt} is null`),
  }),
);

export const devicePushTokensTable = pgTable(
  "device_push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: varchar("platform", { length: 20 }).notNull().default("unknown"),
    deviceLabel: varchar("device_label", { length: 80 }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    lastError: text("last_error"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userToken: uniqueIndex("idx_device_push_tokens_user_token").on(t.userId, t.token),
    userActive: index("idx_device_push_tokens_user").on(t.userId),
  }),
);

export const notificationPreferencesTable = pgTable("notification_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  pushEnabled: boolean("push_enabled").notNull().default(true),
  maintenanceEnabled: boolean("maintenance_enabled").notNull().default(true),
  recommendationsEnabled: boolean("recommendations_enabled").notNull().default(true),
  diagnosticsEnabled: boolean("diagnostics_enabled").notNull().default(true),
  documentsEnabled: boolean("documents_enabled").notNull().default(true),
  deviceEnabled: boolean("device_enabled").notNull().default(true),
  subscriptionsEnabled: boolean("subscriptions_enabled").notNull().default(true),
  quietHoursStart: smallint("quiet_hours_start"),
  quietHoursEnd: smallint("quiet_hours_end"),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationDeliveriesTable = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notificationsTable.id, { onDelete: "cascade" }),
    tokenId: uuid("token_id").references(() => devicePushTokensTable.id, {
      onDelete: "set null",
    }),
    provider: varchar("provider", { length: 20 }).notNull().default("expo"),
    ticketId: varchar("ticket_id", { length: 80 }),
    status: varchar("status", { length: 30 }).notNull(),
    errorMessage: text("error_message"),
    receiptStatus: varchar("receipt_status", { length: 30 }),
    receiptError: text("receipt_error"),
    receiptCheckedAt: timestamp("receipt_checked_at", { withTimezone: true }),
    attempt: integer("attempt").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    notificationIdx: index("idx_notification_deliveries_notification").on(t.notificationId),
    statusIdx: index("idx_notification_deliveries_status").on(t.status, t.createdAt),
  }),
);

export const notificationEventsTable = pgTable(
  "notification_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehiclesTable.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 60 }).notNull(),
    source: varchar("source", { length: 40 }).notNull().default("system"),
    sourceId: varchar("source_id", { length: 160 }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_notification_events_user").on(t.userId, t.createdAt),
    typeIdx: index("idx_notification_events_type").on(t.eventType, t.createdAt),
  }),
);

export const notificationRulesTable = pgTable("notification_rules", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vehicleDocumentsTable = pgTable(
  "vehicle_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 30 }).notNull(),
    expiresAt: date("expires_at").notNull(),
    source: varchar("source", { length: 30 }).notNull().default("user_entered"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    vehicleKind: uniqueIndex("idx_vehicle_documents_vehicle_kind").on(t.vehicleId, t.kind),
    userIdx: index("idx_vehicle_documents_user").on(t.userId),
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
  maxVehicles: integer("max_vehicles"),
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
