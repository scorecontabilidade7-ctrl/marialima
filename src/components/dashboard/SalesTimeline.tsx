import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, BarChart, Bar, LabelList, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import type { TimelineItem } from "@/hooks/useSalesData";
import { BR_TIME_ZONE } from "@/lib/utils";

interface SalesTimelineProps {
  timeline: TimelineItem[];
  metaDiaria?: number;
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`;
  return `R$ ${value.toFixed(0)}`;
}

function formatMobileLabel(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
}

export default function SalesTimeline({ timeline, metaDiaria = 3750 }: SalesTimelineProps) {
  const data = [...timeline].sort((a, b) => a.date.localeCompare(b.date));
  const mobileData = data.slice(-7); // Last 7 days

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          <span className="hidden md:inline">Vendas ao Longo do Tempo</span>
          <span className="md:hidden">Vendas (Últimos 7 Dias)</span>
        </CardTitle>
        {metaDiaria > 0 && (
          <p className="text-[11px] text-muted-foreground md:hidden mt-0.5 font-medium">
            Comparado à meta mínima diária de {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(metaDiaria)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* --- MOBILE LAYOUT (Last 7 days, Bar Chart, No Y Axis) --- */}
        <div className="block md:hidden">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mobileData} margin={{ left: 0, right: 0, top: 30, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: "500" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  const d = new Date(v + "T12:00:00Z");
                  return d.toLocaleDateString("pt-BR", { timeZone: BR_TIME_ZONE, day: "2-digit", month: "2-digit" });
                }}
              />
              <Tooltip
                formatter={(value: number) => [new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value), "Vendas"]}
                labelFormatter={(label) => {
                  const d = new Date(label + "T12:00:00Z");
                  return d.toLocaleDateString("pt-BR", { timeZone: BR_TIME_ZONE, day: "2-digit", month: "long", year: "numeric" });
                }}
                contentStyle={{ backgroundColor: "#fff", border: "1px solid hsl(220,13%,88%)", borderRadius: "6px", color: "#000", fontSize: 12 }}
                labelStyle={{ color: "#000", fontWeight: "bold" }}
                itemStyle={{ color: "#000" }}
                cursor={{ fill: "hsl(220,13%,95%)" }}
              />
              {metaDiaria > 0 && (
                <ReferenceLine y={metaDiaria} stroke="hsl(220,10%,60%)" strokeDasharray="3 3" />
              )}
              <Bar dataKey="total" fill="hsl(207,70%,55%)" radius={[4, 4, 0, 0]} maxBarSize={40}>
                <LabelList 
                  dataKey="total" 
                  position="top" 
                  content={(props: any) => {
                    const { x, y, width, value } = props;
                    const hit = value >= metaDiaria;
                    const formatted = formatMobileLabel(value);
                    return (
                      <g transform={`translate(${x + width / 2},${y - 4})`}>
                        <text x={0} y={-10} fontSize="12" textAnchor="middle">
                          {hit ? "🎯" : "⚠️"}
                        </text>
                        <text x={0} y={2} fill="hsl(var(--foreground))" fontSize="10" textAnchor="middle" fontWeight="bold">
                          {formatted}
                        </text>
                      </g>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* --- DESKTOP LAYOUT (Full Data, Area Chart, With Y Axis) --- */}
        <div className="hidden md:block">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(207,70%,55%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(207,70%,55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,90%)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(220,10%,46%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  const d = new Date(v + "T12:00:00Z");
                  return d.toLocaleDateString("pt-BR", { timeZone: BR_TIME_ZONE, day: "2-digit", month: "short" });
                }}
                interval="preserveStartEnd"
              />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: "hsl(220,10%,46%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number) => [new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value), "Vendas"]}
                labelFormatter={(label) => {
                  const d = new Date(label + "T12:00:00Z");
                  return d.toLocaleDateString("pt-BR", { timeZone: BR_TIME_ZONE, day: "2-digit", month: "long", year: "numeric" });
                }}
                contentStyle={{ backgroundColor: "#fff", border: "1px solid hsl(220,13%,88%)", borderRadius: "6px", color: "#000" }}
                labelStyle={{ color: "#000", fontWeight: "bold" }}
                itemStyle={{ color: "#000" }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(207,70%,55%)"
                strokeWidth={2}
                fill="url(#blueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
