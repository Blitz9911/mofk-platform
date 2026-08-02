import { Alert } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

type PdfField = {
  label: string;
  value: string | number | null | undefined;
};

export type PdfSection = {
  title: string;
  items: Array<{
    title: string;
    subtitle?: string | null;
    badge?: string | null;
    fields: PdfField[];
  }>;
};

type ExportPdfInput = {
  title: string;
  subtitle?: string;
  fileLabel: string;
  sections: PdfSection[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function displayValue(value: PdfField["value"]) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function buildItems(section: PdfSection) {
  return section.items
    .map((item) => {
      const fields = item.fields
        .filter((field) => displayValue(field.value) !== "-")
        .map(
          (field) => `
            <div class="field">
              <span class="field-label">${escapeHtml(field.label)}</span>
              <span class="field-value">${escapeHtml(displayValue(field.value))}</span>
            </div>
          `,
        )
        .join("");

      return `
        <article class="card">
          <div class="card-head">
            ${item.badge ? `<span class="badge">${escapeHtml(item.badge)}</span>` : ""}
            <div class="card-title-wrap">
              <h3>${escapeHtml(item.title)}</h3>
              ${item.subtitle ? `<p>${escapeHtml(item.subtitle)}</p>` : ""}
            </div>
          </div>
          <div class="fields">${fields || `<div class="empty-field">لا توجد تفاصيل إضافية</div>`}</div>
        </article>
      `;
    })
    .join("");
}

function buildHtml(input: ExportPdfInput) {
  const generatedAt = new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const sections = input.sections
    .filter((section) => section.items.length > 0)
    .map(
      (section) => `
        <section>
          <div class="section-head">
            <span>${section.items.length.toLocaleString("ar-SA")} عنصر</span>
            <h2>${escapeHtml(section.title)}</h2>
          </div>
          ${buildItems(section)}
        </section>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { margin: 28px; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            direction: rtl;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
            color: #151515;
            background: #ffffff;
          }
          .cover {
            padding: 24px;
            border-radius: 22px;
            color: #ffffff;
            background: linear-gradient(135deg, #FF6A00, #E65C00);
            margin-bottom: 18px;
          }
          .brand {
            display: inline-block;
            padding: 6px 12px;
            border: 1px solid rgba(255,255,255,0.34);
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
          }
          h1 {
            margin: 16px 0 8px;
            font-size: 30px;
            line-height: 1.35;
          }
          .subtitle {
            margin: 0;
            max-width: 680px;
            color: rgba(255,255,255,0.88);
            font-size: 14px;
            line-height: 1.8;
          }
          .meta {
            margin-top: 18px;
            color: rgba(255,255,255,0.78);
            font-size: 12px;
          }
          section {
            margin-top: 18px;
            page-break-inside: avoid;
          }
          .section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .section-head h2 {
            margin: 0;
            color: #111111;
            font-size: 18px;
          }
          .section-head span {
            color: #FF6A00;
            font-size: 12px;
            font-weight: 700;
          }
          .card {
            border: 1px solid #E5E7EB;
            border-radius: 16px;
            padding: 14px;
            margin-bottom: 10px;
            background: #FAFAFA;
            page-break-inside: avoid;
          }
          .card-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 10px;
          }
          .card-title-wrap {
            flex: 1;
            text-align: right;
          }
          h3 {
            margin: 0;
            color: #111111;
            font-size: 16px;
            line-height: 1.5;
          }
          .card p {
            margin: 4px 0 0;
            color: #6B7280;
            font-size: 12px;
            line-height: 1.7;
          }
          .badge {
            white-space: nowrap;
            border-radius: 999px;
            padding: 5px 9px;
            color: #FF6A00;
            background: rgba(255,106,0,0.12);
            font-size: 11px;
            font-weight: 800;
          }
          .fields {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }
          .field {
            border-radius: 12px;
            padding: 9px 10px;
            background: #ffffff;
            border: 1px solid #EEEEEE;
          }
          .field-label {
            display: block;
            margin-bottom: 4px;
            color: #8A8F94;
            font-size: 10px;
            font-weight: 700;
          }
          .field-value {
            display: block;
            color: #151515;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.55;
          }
          .empty-field {
            grid-column: 1 / -1;
            color: #8A8F94;
            font-size: 12px;
          }
          .footer {
            margin-top: 22px;
            padding-top: 12px;
            border-top: 1px solid #E5E7EB;
            color: #8A8F94;
            font-size: 10px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <header class="cover">
          <span class="brand">مفك</span>
          <h1>${escapeHtml(input.title)}</h1>
          ${input.subtitle ? `<p class="subtitle">${escapeHtml(input.subtitle)}</p>` : ""}
          <div class="meta">تاريخ التصدير: ${escapeHtml(generatedAt)}</div>
        </header>
        ${sections}
        <div class="footer">هذا التقرير صادر من تطبيق مفك، ويعتمد على البيانات المسجلة داخل حسابك.</div>
      </body>
    </html>
  `;
}

export async function exportPdf(input: ExportPdfInput) {
  const hasData = input.sections.some((section) => section.items.length > 0);

  if (!hasData) {
    Alert.alert("لا توجد بيانات", "لا يمكن تصدير PDF قبل توفر بيانات.");
    return;
  }

  try {
    const result = await Print.printToFileAsync({
      html: buildHtml(input),
      base64: false,
      margins: {
        left: 24,
        top: 24,
        right: 24,
        bottom: 24,
      },
    });

    const available = await Sharing.isAvailableAsync();

    if (available) {
      await Sharing.shareAsync(result.uri, {
        mimeType: "application/pdf",
        dialogTitle: input.fileLabel,
        UTI: "com.adobe.pdf",
      });
      return;
    }

    Alert.alert("تم إنشاء PDF", result.uri);
  } catch (error) {
    Alert.alert("تعذر التصدير", error instanceof Error ? error.message : "حاول مرة أخرى.");
  }
}
