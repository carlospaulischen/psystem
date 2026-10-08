import { readFileSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";

const NAVY = "#102A43";
const GRAY = "#486581";
const VIOLET = "#8B5CF6";

// Renderiza um PDF simples com a marca PSYSTEM no cabeçalho.
// O símbolo oficial é lido de /public — nunca regenere/redesenhe.
export function renderBrandedPdf(input: {
  title: string;
  subtitle?: string;
  sections: { heading?: string; body: string }[];
  footer?: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Cabeçalho com símbolo + nome
    try {
      const symbol = readFileSync(
        join(process.cwd(), "public/brand/psystem/symbol-128.png"),
      );
      doc.image(symbol, 56, 48, { width: 34 });
    } catch {
      // sem o asset, segue só com texto
    }
    doc
      .fontSize(16)
      .fillColor(NAVY)
      .text("PSYSTEM", 100, 54, { characterSpacing: 1 })
      .fontSize(8)
      .fillColor(GRAY)
      .text("TECNOLOGIA PARA SAÚDE MENTAL", 100, 74, { characterSpacing: 2 });

    doc
      .moveTo(56, 100)
      .lineTo(539, 100)
      .strokeColor(VIOLET)
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(2);
    doc.fontSize(15).fillColor(NAVY).text(input.title, { lineGap: 4 });
    if (input.subtitle) {
      doc.moveDown(0.4);
      doc.fontSize(9).fillColor(GRAY).text(input.subtitle);
    }

    for (const s of input.sections) {
      doc.moveDown(1.4);
      if (s.heading) {
        doc.fontSize(10).fillColor(VIOLET).text(s.heading.toUpperCase(), {
          characterSpacing: 0.5,
        });
        doc.moveDown(0.3);
      }
      doc
        .fontSize(10.5)
        .fillColor(NAVY)
        .text(s.body, { lineGap: 4, align: "left" });
    }

    doc.moveDown(3);
    doc
      .fontSize(8)
      .fillColor(GRAY)
      .text(
        input.footer ??
          "Documento gerado pelo PSYSTEM. Este documento pode conter informações protegidas por sigilo profissional.",
        56,
        doc.page.height - 72,
        { width: 483, align: "center" },
      );

    doc.end();
  });
}
