import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, NativeModules, Platform, TurboModuleRegistry } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";

const STORAGE_KEY = "mfk-maintenance-invoices";

export type MaintenanceInvoice = {
  logId: string;
  name: string;
  uri: string;
  mime: string;
  kind: "image" | "pdf";
  createdAt: string;
};

export type InvoiceDraft = Omit<MaintenanceInvoice, "logId" | "createdAt">;

async function readAll(): Promise<Record<string, MaintenanceInvoice>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, MaintenanceInvoice>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function getMaintenanceInvoice(logId: string) {
  const all = await readAll();
  return all[logId] ?? null;
}

export async function listMaintenanceInvoices() {
  return readAll();
}

function loadFileSystem(): {
  documentDirectory?: string | null;
  copyAsync?: (options: { from: string; to: string }) => Promise<void>;
  makeDirectoryAsync?: (path: string, options?: { intermediates?: boolean }) => Promise<void>;
} | null {
  try {
    return require("expo-file-system/legacy");
  } catch {
    try {
      return require("expo-file-system");
    } catch {
      return null;
    }
  }
}

async function persistInvoiceFile(logId: string, draft: InvoiceDraft): Promise<InvoiceDraft> {
  const fs = loadFileSystem();
  const root = fs?.documentDirectory;
  if (!fs?.copyAsync || !root || !draft.uri) return draft;
  const ext = draft.kind === "pdf" ? "pdf" : draft.mime.includes("png") ? "png" : "jpg";
  const dir = `${root}mfk-invoices/`;
  const dest = `${dir}${logId}.${ext}`;
  try {
    await fs.makeDirectoryAsync?.(dir, { intermediates: true });
    await fs.copyAsync({ from: draft.uri, to: dest });
    return { ...draft, uri: dest };
  } catch {
    return draft;
  }
}

export async function saveMaintenanceInvoice(logId: string, draft: InvoiceDraft) {
  const persisted = await persistInvoiceFile(logId, draft);
  const all = await readAll();
  all[logId] = {
    ...persisted,
    logId,
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

async function fromImageResult(result: ImagePicker.ImagePickerResult): Promise<InvoiceDraft | null> {
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    name: asset.fileName || "فاتورة.jpg",
    uri: asset.uri,
    mime: asset.mimeType || "image/jpeg",
    kind: "image",
  };
}

export async function pickInvoiceImage(source: "camera" | "library") {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("صلاحية الكاميرا", "اسمح للكاميرا لتصوير الفاتورة.");
      return null;
    }
    return fromImageResult(
      await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      }),
    );
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("صلاحية الصور", "اسمح بالوصول للمعرض لاختيار الفاتورة.");
    return null;
  }
  return fromImageResult(
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    }),
  );
}

function hasNativeDocumentPicker(): boolean {
  try {
    const core = require("expo-modules-core") as {
      requireOptionalNativeModule?: (name: string) => unknown;
    };
    if (typeof core.requireOptionalNativeModule === "function") {
      return core.requireOptionalNativeModule("ExpoDocumentPicker") != null;
    }
  } catch {
    /* Some binaries don't expose the optional helper. */
  }

  try {
    if (NativeModules.ExpoDocumentPicker || NativeModules.ExponentDocumentPicker) {
      return true;
    }
    return TurboModuleRegistry.get("ExpoDocumentPicker") != null;
  } catch {
    return false;
  }
}

export async function pickInvoicePdf(): Promise<InvoiceDraft | null> {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/pdf";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        resolve({
          name: file.name,
          uri: URL.createObjectURL(file),
          mime: file.type || "application/pdf",
          kind: "pdf",
        });
      };
      input.click();
    });
  }

  if (!hasNativeDocumentPicker()) {
    Alert.alert(
      "فاتورة PDF",
      "هالنسخة الحالية ما تدعم ملفات الآيفون. لا نفتح المعرض عشان ما يطيح التطبيق. صوّر الفاتورة أو اختر صورتها إلى أن ينزل بناء أصلي فيه منتقي الملفات.",
    );
    return null;
  }

  try {
    const DocumentPicker = require("expo-document-picker") as typeof import("expo-document-picker");
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return {
      name: asset.name || "فاتورة.pdf",
      uri: asset.uri,
      mime: asset.mimeType || "application/pdf",
      kind: "pdf",
    };
  } catch (error) {
    Alert.alert("فاتورة PDF", "تعذر فتح ملفات الجهاز في هالنسخة.");
    console.warn("DocumentPicker failed", error);
    return null;
  }
}

export async function openMaintenanceInvoice(invoice: MaintenanceInvoice): Promise<"image" | "opened" | "failed"> {
  if (invoice.kind === "image") return "image";

  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(invoice.uri, {
        mimeType: invoice.mime || "application/pdf",
        dialogTitle: invoice.name,
        UTI: "com.adobe.pdf",
      });
      return "opened";
    }
    await Linking.openURL(invoice.uri);
    return "opened";
  } catch (error) {
    Alert.alert(
      "تعذر فتح الفاتورة",
      error instanceof Error
        ? "الملف غير موجود أو انتهت صلاحية الرابط. أرفق الفاتورة من جديد من تفاصيل الصيانة."
        : "تعذر فتح الملف على هذا الجهاز.",
    );
    return "failed";
  }
}
