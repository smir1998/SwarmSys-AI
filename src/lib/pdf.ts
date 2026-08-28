import { jsPDF } from "jspdf";

/* Client-side PDF rendering of the final report — no server, no print dialog.
   Parses the markdown-lite structure (h1/h2/bullets/code/rules) into a typeset A4. */

export function buildReportPdf(md: string, meta: { task: string; operator: string; score: number | null }): string {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = 595.28;
  const M = 46;
  let y = 0;

  const ensure = (h: number) => {
    if (y + h > 796) {
      doc.addPage();
      y = M;
    }
  };

  /* header band */
  doc.setFillColor(10, 15, 18);
  doc.rect(0, 0, W, 96, "F");
  doc.setTextColor(255, 180, 84);
  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  doc.text("SWARMSYS AI — RUN REPORT", M, 34);
  doc.setTextColor(216, 227, 228);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const taskLines = doc.splitTextToSize(`Task: ${meta.task}`, W - M * 2);
  doc.text(taskLines.slice(0, 2), M, 52);
  doc.setFontSize(8);
  doc.setTextColor(143, 163, 168);
  doc.text(
    `Operator: ${meta.operator}    ·    Quality score: ${meta.score ?? "—"} / 100    ·    ${new Date().toLocaleString()}`,
    M,
    78,
  );
  y = 122;

  let inCode = false;
  for (const raw of md.split("\n")) {
    if (raw.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      doc.setFont("courier", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(38, 58, 52);
      const lines = doc.splitTextToSize(raw.length ? raw : " ", W - M * 2 - 18);
      for (const ln of lines) {
        ensure(10.5);
        doc.setFillColor(238, 240, 235);
        doc.rect(M, y - 7.5, W - M * 2, 10.5, "F");
        doc.text(ln, M + 9, y);
        y += 10.5;
      }
      continue;
    }
    const clean = raw.replace(/\*\*/g, "");
    if (raw.startsWith("# ")) {
      ensure(34);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(23, 32, 36);
      doc.text(clean.slice(2), M, y);
      y += 24;
    } else if (raw.startsWith("## ")) {
      ensure(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(190, 116, 26);
      doc.text(clean.slice(3).toUpperCase(), M, y);
      doc.setDrawColor(222, 222, 214);
      doc.setLineWidth(0.6);
      doc.line(M, y + 4, W - M, y + 4);
      y += 19;
    } else if (raw.startsWith("- ")) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.6);
      doc.setTextColor(58, 70, 74);
      const lines = doc.splitTextToSize("•   " + clean.slice(2), W - M * 2 - 12);
      for (const ln of lines) {
        ensure(12.5);
        doc.text(ln, M + 6, y);
        y += 12.5;
      }
    } else if (raw.trim() === "---") {
      ensure(16);
      doc.setDrawColor(196, 202, 196);
      doc.setLineDashPattern([3, 3], 0);
      doc.line(M, y, W - M, y);
      doc.setLineDashPattern([], 0);
      y += 14;
    } else if (raw.trim()) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.8);
      doc.setTextColor(58, 70, 74);
      const lines = doc.splitTextToSize(clean, W - M * 2);
      for (const ln of lines) {
        ensure(12.5);
        doc.text(ln, M, y);
        y += 12.5;
      }
    }
  }

  /* return a blob URL so the UI can preview, save or open it — works
     even in contexts where anchor-click downloads are blocked */
  return URL.createObjectURL(doc.output("blob") as Blob);
}
