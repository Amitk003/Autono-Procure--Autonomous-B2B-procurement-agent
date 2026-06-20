import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");

const TS = new Date().toISOString().replace(/[:.]/g, "-");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

export async function saveToExcel(
  phase: string,
  rows: Record<string, unknown>[],
): Promise<string> {
  const filename = `${TS}_${phase}.xlsx`;
  const path = join(DATA_DIR, filename);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Autono-Procure";
  wb.created = new Date();

  const ws = wb.addWorksheet(phase.replace(/_/g, " "));

  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);

    ws.columns = headers.map((h) => ({
      header: h,
      key: h,
      width: Math.max(h.length * 2, 20),
    }));

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    rows.forEach((row) => ws.addRow(row));
  }

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: rows.length + 1, column: Object.keys(rows[0] ?? {}).length || 1 },
  };

  await wb.xlsx.writeFile(path);
  return path;
}
