import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DashboardKPIs, RankingItem } from "@/hooks/useSalesData";
import type { MonthlyGoal } from "@/hooks/useMonthlyGoals";

export interface PdfReportOptions {
  store: "sobral" | "itapipoca" | "consolidado";
  selectedMonth: { year: number; month: number };
  kpis?: DashboardKPIs;
  ranking: RankingItem[];
  goalData?: MonthlyGoal;
  commissionMode: "fixa" | "dinamica";
  activeFiltersDesc?: string;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value || 0);
}

export async function generateMonthlyPdfReport(options: PdfReportOptions): Promise<void> {
  const {
    store,
    selectedMonth,
    kpis,
    ranking,
    goalData,
    commissionMode,
    activeFiltersDesc,
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Curated color palette
  const primaryTeal: [number, number, number] = [13, 148, 136];      // #0d9488
  const darkNavy: [number, number, number] = [15, 23, 42];          // #0f172a
  const textDark: [number, number, number] = [30, 41, 59];          // #1e293b
  const textMuted: [number, number, number] = [100, 116, 139];      // #64748b
  const bgLight: [number, number, number] = [248, 250, 252];        // #f8fafc
  const borderColor: [number, number, number] = [226, 232, 240];    // #e2e8f0

  const storeTitle =
    store === "sobral"
      ? "Loja Sobral"
      : store === "itapipoca"
      ? "Loja Itapipoca"
      : "Consolidado (Sobral + Itapipoca)";

  const monthLabel = `${MONTH_NAMES[selectedMonth.month - 1]} de ${selectedMonth.year}`;
  const now = new Date();
  const emissionDateStr = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }) + " às " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  let cursorY = margin;

  // ── 1. HEADER BANNER ──────────────────────────────────────────────────────────
  doc.setFillColor(...darkNavy);
  doc.roundedRect(margin, cursorY, contentWidth, 24, 3, 3, "F");

  // Top accent bar
  doc.setFillColor(...primaryTeal);
  doc.rect(margin, cursorY, contentWidth, 2, "F");

  // Header Titles
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("MARIA LIMA | RESUMO MENSAL DE VENDAS", margin + 6, cursorY + 10.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`Visão Executiva do Mês · ${storeTitle}`, margin + 6, cursorY + 17.5);

  // Month badge (Right side)
  doc.setFillColor(...primaryTeal);
  doc.roundedRect(pageWidth - margin - 56, cursorY + 5.5, 50, 13, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(monthLabel.toUpperCase(), pageWidth - margin - 31, cursorY + 13.5, { align: "center" });

  cursorY += 28;

  // ── 2. METADATA STRIP ────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text(
    `Gerado em: ${emissionDateStr}  |  Modo de Comissão: ${commissionMode === "dinamica" ? "Dinâmica (por Metas)" : "Fixa (Original ERP)"}${activeFiltersDesc ? `  |  ${activeFiltersDesc}` : ""}`,
    margin,
    cursorY
  );

  cursorY += 4;

  // ── 3. EXECUTIVE DIAGNOSIS / SUMMARY ─────────────────────────────────────────
  const totalVendas = kpis?.total_vendas || 0;
  const qtdVendas = kpis?.qtd_vendas || 0;
  const ticketMedio = kpis?.ticket_medio || 0;
  const totalComissoes = kpis?.total_comissoes || 0;
  const topSeller = ranking[0];

  const metaMinimaLoja = goalData?.meta_minima || (store === "consolidado" ? 180000 : 90000);
  const metaMasterLoja = goalData?.meta_master || (store === "consolidado" ? 300000 : 150000);
  const pctMetaMinima = metaMinimaLoja > 0 ? (totalVendas / metaMinimaLoja) * 100 : 0;

  let metaStatusText = "";
  if (totalVendas >= metaMasterLoja) {
    metaStatusText = `A loja superou a Meta Master com ${((totalVendas / metaMasterLoja) * 100).toFixed(1)}% do objetivo alcançado.`;
  } else if (totalVendas >= metaMinimaLoja) {
    metaStatusText = `A loja atingiu a Meta Mínima (${pctMetaMinima.toFixed(1)}% de realização).`;
  } else {
    metaStatusText = `A loja realizou ${pctMetaMinima.toFixed(1)}% da Meta Mínima (faltando ${formatBRL(metaMinimaLoja - totalVendas)}).`;
  }

  const topSellerText = topSeller?.vendedor
    ? `Destaque individual: ${topSeller.vendedor} com ${formatBRL(topSeller.total)} (${((topSeller.total / (totalVendas || 1)) * 100).toFixed(1)}% do total).`
    : "";

  const summaryText = `No mês de ${monthLabel}, a unidade ${storeTitle} faturou ${formatBRL(totalVendas)} em ${formatNumber(qtdVendas)} pedidos (Ticket Médio: ${formatBRL(ticketMedio)}). ${metaStatusText} ${topSellerText}`;

  doc.setFillColor(...bgLight);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, cursorY, contentWidth, 16, 2, 2, "FD");

  // Left Teal Accent
  doc.setFillColor(...primaryTeal);
  doc.rect(margin, cursorY, 1.5, 16, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...primaryTeal);
  doc.text("DIAGNÓSTICO E RESUMO DO MÊS", margin + 4, cursorY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textDark);
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 8);
  doc.text(splitSummary, margin + 4, cursorY + 9);

  cursorY += 20;

  // ── 4. KPI CARDS (4 COLUMNS) ─────────────────────────────────────────────────
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 17;

  const kpisList = [
    { label: "FATURAMENTO TOTAL", value: formatBRL(totalVendas), sub: `${formatNumber(qtdVendas)} pedidos` },
    { label: "QTD. DE VENDAS", value: formatNumber(qtdVendas), sub: "cupons emitidos" },
    { label: "TICKET MÉDIO", value: formatBRL(ticketMedio), sub: "por venda realizada" },
    { label: "TOTAL COMISSÕES", value: formatBRL(totalComissoes), sub: commissionMode === "dinamica" ? "comissão dinâmica" : "comissão fixa" },
  ];

  kpisList.forEach((kpi, idx) => {
    const cardX = margin + idx * (cardWidth + 3);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(cardX, cursorY, cardWidth, cardHeight, 2, 2, "FD");

    // Top color bar
    doc.setFillColor(...primaryTeal);
    doc.rect(cardX, cursorY, cardWidth, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...textMuted);
    doc.text(kpi.label, cardX + 3.5, cursorY + 4.8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...darkNavy);
    doc.text(kpi.value, cardX + 3.5, cursorY + 10.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...textMuted);
    doc.text(kpi.sub, cardX + 3.5, cursorY + 14.5);
  });

  cursorY += cardHeight + 6;

  // ── 5. GOALS COMPARISON TABLE (RESUMIDA) ────────────────────────────────────
  const sellerCount = Math.max(ranking.length, 1);
  const mMinima = goalData?.meta_minima || (store === "consolidado" ? 180000 : 90000);
  const mTop1 = goalData?.meta_top1 || (store === "consolidado" ? 220000 : 110000);
  const mTop2 = goalData?.meta_top2 || (store === "consolidado" ? 260000 : 130000);
  const mMaster = goalData?.meta_master || (store === "consolidado" ? 300000 : 150000);

  const goalsRows = [
    [
      "Meta Mínima",
      formatBRL(mMinima),
      formatBRL(totalVendas),
      `${((totalVendas / mMinima) * 100).toFixed(1)}%`,
      totalVendas >= mMinima ? "ATINGIDA" : `Falta ${formatBRL(mMinima - totalVendas)}`
    ],
    [
      "Top 1",
      formatBRL(mTop1),
      formatBRL(totalVendas),
      `${((totalVendas / mTop1) * 100).toFixed(1)}%`,
      totalVendas >= mTop1 ? "ATINGIDA" : `Falta ${formatBRL(mTop1 - totalVendas)}`
    ],
    [
      "Top 2",
      formatBRL(mTop2),
      formatBRL(totalVendas),
      `${((totalVendas / mTop2) * 100).toFixed(1)}%`,
      totalVendas >= mTop2 ? "ATINGIDA" : `Falta ${formatBRL(mTop2 - totalVendas)}`
    ],
    [
      "Master",
      formatBRL(mMaster),
      formatBRL(totalVendas),
      `${((totalVendas / mMaster) * 100).toFixed(1)}%`,
      totalVendas >= mMaster ? "ATINGIDA" : `Falta ${formatBRL(mMaster - totalVendas)}`
    ],
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text("1. Acompanhamento de Metas da Loja no Mês", margin, cursorY);
  cursorY += 2;

  autoTable(doc, {
    startY: cursorY,
    head: [["Nível da Meta", "Meta da Loja", "Realizado", "% Atingido", "Status"]],
    body: goalsRows,
    theme: "grid",
    headStyles: {
      fillColor: darkNavy,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 1.8,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: textDark,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { fontStyle: "bold", halign: "left" },
      1: { halign: "right" },
      2: { halign: "right", fontStyle: "bold" },
      3: { halign: "center", fontStyle: "bold" },
      4: { halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        if (String(data.cell.raw) === "ATINGIDA") {
          data.cell.styles.textColor = [22, 163, 74]; // Emerald
        } else {
          data.cell.styles.textColor = [220, 38, 38]; // Red
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 6;

  // ── 6. SELLER RANKING & COMMISSIONS TABLE (RESUMO) ──────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text("2. Desempenho e Comissões dos Vendedores no Mês", margin, cursorY);
  cursorY += 2;

  const indMetaMinima = mMinima / sellerCount;
  const indMetaTop1 = mTop1 / sellerCount;
  const indMetaTop2 = mTop2 / sellerCount;
  const indMetaMaster = mMaster / sellerCount;

  const rankingRows = ranking.map((item, index) => {
    const partPct = totalVendas > 0 ? (item.total / totalVendas) * 100 : 0;
    const tktMedio = item.qtd_vendas > 0 ? item.total / item.qtd_vendas : 0;

    let nivelAlcancado = "Abaixo da Mínima";
    if (item.total >= indMetaMaster) nivelAlcancado = "Master (2,0%)";
    else if (item.total >= indMetaTop2) nivelAlcancado = "Top 2 (1,5%)";
    else if (item.total >= indMetaTop1) nivelAlcancado = "Top 1 (1,3%)";
    else if (item.total >= indMetaMinima) nivelAlcancado = "Mínima (1,0%)";

    return [
      `#${index + 1}`,
      item.vendedor,
      formatBRL(item.total),
      formatNumber(item.qtd_vendas),
      formatBRL(tktMedio),
      nivelAlcancado,
      formatBRL(item.comissao),
      `${partPct.toFixed(1)}%`,
    ];
  });

  autoTable(doc, {
    startY: cursorY,
    head: [["Pos.", "Vendedor(a)", "Total Vendido", "Pedidos", "Ticket Médio", "Nível Atingido", "Comissão", "Part. %"]],
    body: rankingRows,
    theme: "striped",
    headStyles: {
      fillColor: primaryTeal,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 1.8,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: textDark,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { halign: "center", fontStyle: "bold", cellWidth: 10 },
      1: { fontStyle: "bold", halign: "left" },
      2: { halign: "right", fontStyle: "bold" },
      3: { halign: "center" },
      4: { halign: "right" },
      5: { halign: "center" },
      6: { halign: "right", fontStyle: "bold", textColor: [13, 148, 136] },
      7: { halign: "center", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  // ── 7. FOOTER ───────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...borderColor);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text("Maria Lima | Gestão Comercial & Performance de Vendas", margin, pageHeight - 6);
    doc.text(`Resumo Mensal · Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }

  // Save the PDF
  const cleanStoreName = store.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const fileName = `Resumo_Mensal_MariaLima_${cleanStoreName}_${selectedMonth.year}_${String(selectedMonth.month).padStart(2, "0")}.pdf`;
  doc.save(fileName);
}

