import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { TimelineItem } from "@/hooks/useSalesData";
import { BR_TIME_ZONE } from "@/lib/utils";

interface SalesTimelineProps {
  timeline: TimelineItem[];
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`;
  return `R$ ${value.toFixed(0)}`;
}

export default function SalesTimeline({ timeline }: SalesTimelineProps) {
  const data = [...timeline].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Vendas ao Longo do Tempo</CardTitle>
      </CardHeader>
      <CardContent>
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
                const d = new Date(v + "T00:00:00Z");
                return d.toLocaleDateString("pt-BR", { timeZone: BR_TIME_ZONE, day: "2-digit", month: "short" });
              }}
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={formatCurrency} tick={{ fill: "hsl(220,10%,46%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: number) => [new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value), "Vendas"]}
              labelFormatter={(label) => {
                const d = new Date(label + "T00:00:00Z");
                return d.toLocaleDateString("pt-BR", { timeZone: BR_TIME_ZONE, day: "2-digit", month: "long", year: "numeric" });
              }}
              contentStyle={{ backgroundColor: "#fff", border: "1px solid hsl(220,13%,88%)", borderRadius: "6px", color: "hsl(220,20%,14%)" }}
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
      </CardContent>
    </Card>
  );
}
