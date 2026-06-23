import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { DashboardKPIs, TimelineItem } from "@/hooks/useSalesData";

interface KPICardsProps {
  kpis?: DashboardKPIs;
  timeline: TimelineItem[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}


function computeTrend(data: { v: number }[]): number {
  if (data.length < 2) return 0;
  const mid = Math.floor(data.length / 2);
  const first = data.slice(0, mid).reduce((s, d) => s + d.v, 0);
  const second = data.slice(mid).reduce((s, d) => s + d.v, 0);
  if (first === 0) return 0;
  return Math.round(((second - first) / first) * 100);
}

export default function KPICards({ kpis, timeline }: KPICardsProps) {
  const totalVendas = kpis?.total_vendas || 0;
  const qtdVendas = kpis?.qtd_vendas || 0;
  const ticketMedio = kpis?.ticket_medio || 0;
  const totalComissoes = kpis?.total_comissoes || 0;

  const sparkSales = timeline.slice(-20).map((t) => ({ v: t.total }));
  const sparkCount = timeline.slice(-20).map((t) => ({ v: t.count }));

  const kpiCardsData = [
    {
      label: "TOTAL DE VENDAS",
      value: formatCurrency(totalVendas),
      icon: DollarSign,
      sparkData: sparkSales,
      sparkColor: "hsl(188,55%,40%)",
      trend: computeTrend(sparkSales),
    },
    {
      label: "QTD. DE VENDAS",
      value: qtdVendas.toLocaleString("pt-BR"),
      icon: ShoppingCart,
      sparkData: sparkCount,
      sparkColor: "hsl(188,48%,54%)",
      trend: computeTrend(sparkCount),
    },
    {
      label: "TICKET MÉDIO",
      value: formatCurrency(ticketMedio),
      icon: TrendingUp,
      sparkData: sparkSales,
      sparkColor: "hsl(200,52%,46%)",
      trend: computeTrend(sparkSales),
    },
    {
      label: "TOTAL COMISSÕES",
      value: formatCurrency(totalComissoes),
      icon: Users,
      sparkData: sparkSales,
      sparkColor: "hsl(172,48%,42%)",
      trend: computeTrend(sparkSales),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpiCardsData.map((kpi) => (
        <Card key={kpi.label} className="border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-2">
                  <kpi.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase truncate">
                    {kpi.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40 shrink-0">▲▼</span>
                </div>
                <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground leading-none">
                  {kpi.value}
                </p>
                <div className="mt-1.5">
                  {kpi.trend > 0 ? (
                    <span className="text-[11px] font-semibold text-emerald-600">
                      ▲{kpi.trend}% período anterior
                    </span>
                  ) : kpi.trend < 0 ? (
                    <span className="text-[11px] font-semibold text-red-500">
                      ▼{Math.abs(kpi.trend)}% período anterior
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">sem variação</span>
                  )}
                </div>
              </div>
              <div className="w-20 h-12 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={kpi.sparkData}>
                    <defs>
                      <linearGradient id={`kpi-spark-${kpi.label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={kpi.sparkColor} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={kpi.sparkColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={kpi.sparkColor}
                      strokeWidth={1.5}
                      fill={`url(#kpi-spark-${kpi.label})`}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
