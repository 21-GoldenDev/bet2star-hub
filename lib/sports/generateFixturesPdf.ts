import PDFDocument from "pdfkit";
import { OPTION_KEYS, optionLabels, SportsMatchRow } from "@/components/sports/types";
import { SportOptionKey } from "@/lib/bets/sportsCombinations";
import { groupSportsMatchesByLeague } from "@/lib/sports/sheetShare";

const printOptionLabels: Record<SportOptionKey, string> = {
  ...optionLabels,
  O25: "Ov2.5",
  U25: "Un2.5",
};

function formatKickoff(iso?: string) {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${hh}:${mm},${day},${month}`;
}

function oddsText(prizes: number[], idx: number) {
  const odds = prizes[idx] || 0;
  return odds.toFixed(2);
}

export async function generateSportsFixturesPdf(options: {
  matches: SportsMatchRow[];
  gameWeek?: number | null;
  gameName?: string | null;
}): Promise<Buffer> {
  const { matches, gameWeek, gameName } = options;
  const grouped = groupSportsMatchesByLeague(matches);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 28, bottom: 28, left: 28, right: 28 },
      info: {
        Title: "Bet2Star Sports Betting Fixtures",
        Author: "Bet2Star",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colCount = 3 + OPTION_KEYS.length;
    // Qbet 6%, Time 12%, Event 28%, odds share 54%
    const widths = [
      pageWidth * 0.06,
      pageWidth * 0.12,
      pageWidth * 0.28,
      ...OPTION_KEYS.map(() => (pageWidth * 0.54) / OPTION_KEYS.length),
    ];

    const startX = doc.page.margins.left;
    let y = doc.page.margins.top;

    const ensureSpace = (needed: number) => {
      if (y + needed > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeaderRow();
      }
    };

    const drawCell = (
      x: number,
      cellY: number,
      w: number,
      h: number,
      text: string,
      opts?: { bold?: boolean; align?: "left" | "center"; fill?: string },
    ) => {
      if (opts?.fill) {
        doc.save();
        doc.rect(x, cellY, w, h).fill(opts.fill);
        doc.restore();
      }
      doc.rect(x, cellY, w, h).stroke("#000");
      doc
        .font(opts?.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8)
        .fillColor("#000")
        .text(text, x + 2, cellY + 4, {
          width: w - 4,
          align: opts?.align ?? "left",
          lineBreak: true,
          height: h - 6,
          ellipsis: true,
        });
    };

    const drawHeaderRow = () => {
      const h = 22;
      const headers = ["Qbet", "Time", "Event", ...OPTION_KEYS.map((k) => printOptionLabels[k])];
      let x = startX;
      for (let i = 0; i < colCount; i++) {
        drawCell(x, y, widths[i], h, headers[i], {
          bold: true,
          align: i === 2 ? "left" : "center",
        });
        x += widths[i];
      }
      y += h;
    };

    // Title
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#000");
    doc.text("Bet2Star — Sports Betting", startX, y, { continued: false });
    y += 18;
    doc.font("Helvetica").fontSize(9);
    const subtitleParts = [
      gameName || null,
      gameWeek != null ? `Week ${gameWeek}` : null,
      `${matches.length} matches`,
    ].filter(Boolean);
    doc.text(subtitleParts.join(" · "), startX, y);
    const printedAt = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.text(`Printed ${printedAt}`, startX, y, { align: "right", width: pageWidth });
    y += 16;

    drawHeaderRow();

    for (const [league, leagueMatches] of Object.entries(grouped)) {
      ensureSpace(40);
      const leagueH = 20;
      doc.save();
      doc.rect(startX, y, pageWidth, leagueH).fillAndStroke("#e5e5e5", "#000");
      doc.restore();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#000")
        .text(league, startX + 4, y + 5, { width: pageWidth - 8 });
      y += leagueH;

      for (const match of leagueMatches) {
        const eventText = `${match.homeTeam} - ${match.awayTeam}`;
        const rowH = Math.max(24, Math.min(36, 12 + Math.ceil(eventText.length / 28) * 10));
        ensureSpace(rowH);

        const cells = [
          String(match.number),
          formatKickoff(match.start_time ?? match.end_time),
          eventText,
          ...OPTION_KEYS.map((_, idx) => oddsText(match.prizes, idx)),
        ];

        let x = startX;
        for (let i = 0; i < colCount; i++) {
          drawCell(x, y, widths[i], rowH, cells[i], {
            bold: i !== 2,
            align: i === 2 ? "left" : "center",
          });
          x += widths[i];
        }
        y += rowH;
      }
    }

    doc.end();
  });
}
