import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { DepartmentItem } from "@/hooks/useSalesData";

interface DepartmentChartProps {
  departamentos: DepartmentItem[];
  totalVendas: number;
}

const COLORS = [
  "#3bbfbf",
  "#4361ee",
  "#e91e8c",
  "#f77f00",
  "#7209b7",
  "#06d6a0",
  "#ef233c",
  "#ffd166",
];

function formatCurrencyShort(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`;
  return `R$ ${value.toFixed(0)}`;
}

export default function DepartmentChart({ departamentos, totalVendas }: DepartmentChartProps) {
  const rawData = departamentos
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map(d => ({ name: d.departamento, value: d.total }));

  const detalhadaTotal = rawData.reduce((s, d) => s + d.value, 0);
  const scale = detalhadaTotal > 0 ? totalVendas / detalhadaTotal : 1;
  const data = rawData.map((d) => ({ ...d, value: d.value * scale }));
  const total = totalVendas;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-bold text-foreground">Vendas por Departamento</CardTitle>
        <p className="text-xs text-muted-foreground">Distribuição do volume total</p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Donut — altura generosa para não cortar */}
          <div className="relative shrink-0 hidden md:block" style={{ width: 160, height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value),
                  ]}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid hsl(220,13%,88%)",
                    borderRadius: "6px",
                    fontSize: 12,
                    color: "#000",
                  }}
                  labelStyle={{ color: "#000", fontWeight: "bold" }}
                  itemStyle={{ color: "#000" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Total no centro */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Total</p>
                <p className="text-xs font-bold text-foreground tabular-nums">{formatCurrencyShort(total)}</p>
              </div>
            </div>
          </div>

          {/* Legenda com mini-barras */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {data.map((item, i) => {
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-[11px] text-foreground truncate w-28 md:flex-1 font-medium">
                    {item.name}
                  </span>
                  <div className="flex flex-1 md:flex-none items-center gap-2 md:gap-1.5 shrink-0 justify-end">
                    <div className="flex-1 md:w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-8 md:w-6 text-right font-medium shrink-0">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
