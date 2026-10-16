import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { smoothBack } from "@/lib/navigation";
import { listV011Readings, useObdConnection } from "@/src/obd";
import type { DecodedPidValue, ObdConnectionState } from "@/src/obd";

const PRIMARY_LIVE_PIDS = ["010C", "010D", "0105", "0104", "0111", "012F", "0142"] as const;

const stateText: Record<ObdConnectionState, string> = {
  idle: "جاهز للبحث",
  permission_required: "صلاحية البلوتوث مطلوبة",
  bluetooth_disabled: "البلوتوث غير مفعل",
  scanning: "جاري البحث عن جهاز مفك",
  device_found: "تم العثور على الجهاز",
  connecting: "جاري الاتصال",
  discovering_services: "جاري اكتشاف خصائص البلوتوث",
  initializing_elm327: "جاري الاتصال بالسيارة",
  vehicle_searching: "جاري البحث عن بروتوكول السيارة",
  connected: "تم الاتصال بالقطعة",
  vehicle_not_ready: "تأكد من تشغيل سويتش السيارة",
  vehicle_connected: "تم الاتصال بالسيارة",
  recovering: "جاري إعادة بناء الجلسة",
  disconnecting: "جاري فصل الاتصال",
  disconnected: "تم فصل الاتصال",
  error: "تعذر الاتصال بالسيارة",
};

function hasMetricData(
  values: Record<string, DecodedPidValue | null>,
) {
  return Object.values(values).some((metric) => metric?.status === "ok");
}

const LIVE_STALE_MS = 12_000;

function MetricCard({
  label,
  metric,
  updatedAt,
}: {
  label: string;
  metric: DecodedPidValue | null;
  updatedAt?: number | null;
}) {
  const colors = useColors();
  const stale = updatedAt != null && Date.now() - updatedAt > LIVE_STALE_MS;
  const ready = metric?.status === "ok" && metric.value != null && metric.value !== "" && !stale;
  const unsupported = metric?.status === "unsupported";

  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: ready ? colors.foreground : colors.mutedForeground, writingDirection: "ltr" }]}>
        {ready ? String(metric.value) : unsupported ? "غير مدعوم" : stale ? "انقطعت القراءة" : "جارٍ القراءة"}
      </Text>
      <Text style={[styles.metricUnit, { color: colors.primary }]}>{ready ? metric?.unit ?? "" : metric?.pid ?? ""}</Text>
    </View>
  );
}

export default function ObdConnectScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const obd = useObdConnection();
  const [showDebug, setShowDebug] = useState(false);

  const primaryBusy = ["scanning", "connecting", "discovering_services", "initializing_elm327", "disconnecting"].includes(obd.state);
  const supportedCount = obd.initResult?.supportedPids.length ?? 0;
  const sortedDevices = useMemo(
    () => [...obd.devices].sort((a, b) => Number(b.isV011Candidate) - Number(a.isV011Candidate) || (b.rssi ?? -999) - (a.rssi ?? -999)),
    [obd.devices],
  );
  const hasLiveData = hasMetricData(obd.liveValues);
  const remainingReadings = useMemo(() => {
    const primary = new Set<string>(PRIMARY_LIVE_PIDS);
    return listV011Readings(obd.liveReadings, obd.initResult?.supportedPids ?? []).filter(
      (item) => !primary.has(item.pid) && item.status !== "unsupported",
    );
  }, [obd.initResult, obd.liveReadings]);

  useFocusEffect(
    useCallback(() => {
      obd.startLivePolling();
      return () => obd.stopLivePolling();
    }, [obd.startLivePolling, obd.stopLivePolling]),
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => smoothBack(router, "/pair-device")}>
          <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>اتصال OBD</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>V011 عبر Bluetooth Low Energy</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statusTop}>
            <View style={[styles.statusPill, { backgroundColor: obd.state === "vehicle_connected" ? "#22c55e18" : "#FF6A0018" }]}>
              <View style={[styles.statusDot, { backgroundColor: obd.state === "vehicle_connected" ? colors.success : colors.primary }]} />
              <Text style={[styles.statusText, { color: obd.state === "vehicle_connected" ? colors.success : colors.primary }]}>
                {stateText[obd.state]}
              </Text>
            </View>
            {primaryBusy ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>
            {obd.userMessage ?? "اتصل بالقطعة لعرض القراءات المباشرة وباقي حساسات السيارة."}
          </Text>
          {obd.technicalError ? (
            <Pressable onPress={() => setShowDebug((value) => !value)}>
              <Text style={[styles.smallStat, { color: colors.mutedForeground }]}>
                {showDebug ? "إخفاء التفاصيل التقنية" : "تفاصيل تقنية"}
              </Text>
            </Pressable>
          ) : null}
          {obd.technicalError && showDebug ? <Text style={styles.errorText}>{obd.technicalError}</Text> : null}
          <View style={styles.statusGrid}>
            <Text style={[styles.smallStat, { color: colors.mutedForeground }]}>الصلاحية: {obd.permissionStatus}</Text>
            <Text style={[styles.smallStat, { color: colors.mutedForeground }]}>البلوتوث: {obd.bluetoothState}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: primaryBusy ? 0.7 : 1 }]}
            onPress={() => void obd.scan()}
            disabled={primaryBusy}
          >
            <Ionicons name="search-outline" size={18} color="#fff" />
            <Text style={styles.primaryText}>{obd.state === "scanning" ? "جاري البحث..." : "بحث عن القطعة"}</Text>
          </Pressable>
          <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => void obd.connectMock()}>
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>تجربة المحاكاة</Text>
          </Pressable>
          <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => router.push("/diagnostics")}>
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>أقسام التشخيص</Text>
          </Pressable>
          {obd.state === "vehicle_connected" ? (
            <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => router.push("/obd-capability-audit")}>
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>فحص القدرات</Text>
            </Pressable>
          ) : null}
          {obd.selectedDevice ? (
            <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => void obd.disconnect()}>
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>فصل الاتصال</Text>
            </Pressable>
          ) : null}
        </View>

        {sortedDevices.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الأجهزة القريبة</Text>
            {sortedDevices.map((device) => (
              <View key={device.id} style={[styles.deviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.deviceMeta}>
                  <Text style={[styles.deviceName, { color: colors.foreground }]}>{device.name}</Text>
                  <Text style={[styles.deviceSub, { color: colors.mutedForeground }]}>
                    RSSI {device.rssi ?? "--"} {device.isV011Candidate ? " · مرشح V011" : ""}
                  </Text>
                </View>
                <Pressable style={[styles.connectButton, { backgroundColor: colors.primary }]} onPress={() => void obd.connect(device)}>
                  <Text style={styles.connectText}>اتصال</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>معلومات القطعة والسيارة</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <InfoLine label="ELM327" value={obd.initResult?.elmVersion ?? "--"} />
            <InfoLine label="الفولتية" value={obd.initResult?.adapterVoltage ?? "--"} />
            <InfoLine label="البروتوكول" value={obd.initResult?.detectedProtocol ?? "--"} />
            <InfoLine label="حالة السيارة" value={obd.initResult?.vehicleConnected ? "متصلة" : "--"} />
            <InfoLine label="عدد PIDs المدعومة" value={String(supportedCount)} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.liveBadge, { backgroundColor: hasLiveData ? "#22c55e18" : colors.muted }]}>
              <View style={[styles.liveBadgeDot, { backgroundColor: hasLiveData ? colors.success : colors.mutedForeground }]} />
              <Text style={[styles.liveBadgeText, { color: hasLiveData ? colors.success : colors.mutedForeground }]}>
                لايف
              </Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>القراءات المباشرة</Text>
          </View>
          <Text style={[styles.queryHint, { color: colors.mutedForeground }]}>
            {hasLiveData ? "القراءات الأساسية من V011" : "بانتظار أول قراءة مباشرة من القطعة"}
          </Text>
          <View style={styles.metricsGrid}>
            <MetricCard label="RPM" metric={obd.liveValues.rpm} updatedAt={obd.liveReadings["010C"]?.updatedAt} />
            <MetricCard label="السرعة" metric={obd.liveValues.speed} updatedAt={obd.liveReadings["010D"]?.updatedAt} />
            <MetricCard label="حرارة المبرد" metric={obd.liveValues.coolantTemp} updatedAt={obd.liveReadings["0105"]?.updatedAt} />
            <MetricCard label="حمل المحرك" metric={obd.liveValues.engineLoad} updatedAt={obd.liveReadings["0104"]?.updatedAt} />
            <MetricCard label="الخانق" metric={obd.liveValues.throttle} updatedAt={obd.liveReadings["0111"]?.updatedAt} />
            <MetricCard label="الوقود" metric={obd.liveValues.fuelLevel} updatedAt={obd.liveReadings["012F"]?.updatedAt} />
            <MetricCard label="الفولتية" metric={obd.liveValues.controlModuleVoltage} updatedAt={obd.liveReadings["0142"]?.updatedAt} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>كل بيانات V011</Text>
          <Text style={[styles.queryHint, { color: colors.mutedForeground }]}>
            {remainingReadings.length > 0
              ? `${remainingReadings.filter((item) => item.status === "ok").length} قراءة إضافية من القطعة`
              : "ستظهر هنا كل الحساسات بعد الاتصال"}
          </Text>
          {remainingReadings.length > 0 ? (
            <View style={styles.metricsGrid}>
              {remainingReadings.map((item) => (
                <MetricCard
                  key={item.pid}
                  label={item.arabicLabel}
                  updatedAt={item.updatedAt}
                  metric={{
                    pid: item.pid,
                    label: item.arabicLabel,
                    value: item.value,
                    unit: item.unit,
                    status: item.status === "ok" || item.status === "unsupported" ? item.status : "no_data",
                    raw: item.raw,
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Pressable style={styles.debugHeader} onPress={() => setShowDebug((value) => !value)}>
            <Ionicons name={showDebug ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>سجل الاتصال</Text>
          </Pressable>
          {showDebug ? (
            <View style={[styles.debugConsole, { backgroundColor: "#050505", borderColor: colors.border }]}>
              {obd.logs.slice(0, 40).map((log) => (
                <Text key={log.id} style={[styles.logLine, { color: log.level === "error" ? colors.destructive : colors.mutedForeground }]}>
                  {new Date(log.createdAt).toLocaleTimeString("ar-SA")} [{log.event}] {log.message}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.infoLine}>
      <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={2}>{value}</Text>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, direction: "rtl" },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  iconButton: { alignItems: "center", borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, height: 36, justifyContent: "center", width: 36 },
  headerText: { alignItems: "flex-end", flex: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  content: { gap: 16, padding: 16 },
  statusCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 12, padding: 16 },
  statusTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  statusPill: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  statusDot: { borderRadius: 5, height: 9, width: 9 },
  statusText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  message: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 22, textAlign: "right" },
  errorText: { color: "#ef4444", fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "left" },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallStat: { fontFamily: "Inter_500Medium", fontSize: 11 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  primaryButton: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: 8, minHeight: 48, paddingHorizontal: 16 },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  secondaryButton: { alignItems: "center", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, justifyContent: "center", minHeight: 48, paddingHorizontal: 16 },
  secondaryText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  section: { gap: 10 },
  sectionHeaderRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "right" },
  queryHint: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: -4, textAlign: "right" },
  liveBadge: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  liveBadgeDot: { borderRadius: 4, height: 7, width: 7 },
  liveBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  deviceCard: { alignItems: "center", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, padding: 14 },
  deviceMeta: { alignItems: "flex-end", flex: 1 },
  deviceName: { fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "right" },
  deviceSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3, textAlign: "right" },
  connectButton: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  connectText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  infoCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  infoLine: { alignItems: "center", borderBottomColor: "#252525", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  infoLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
  infoValue: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 13, textAlign: "left", writingDirection: "ltr" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { alignItems: "flex-end", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, minHeight: 112, padding: 14, width: Platform.OS === "web" ? "31%" : "47%" },
  metricLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
  metricValue: { fontFamily: "Inter_700Bold", fontSize: 28, marginTop: 12 },
  metricUnit: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  dangerButton: { alignItems: "center", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50 },
  dangerText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  debugHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  debugConsole: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 6, padding: 12 },
  logLine: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17, textAlign: "left" },
});
