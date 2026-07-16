import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
import { useState } from "react";
import type { DepartmentItem } from "@/hooks/useSalesData";

interface DepartmentChartProps {
  departamentos: DepartmentItem[];
  totalVendas: number;
  topClients?: { name: string; total: number }[];
}

function formatCurrencyShort(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`;
  return `R$ ${value.toFixed(0)}`;
}

export default function DepartmentChart({ departamentos, totalVendas, topClients = [] }: DepartmentChartProps) {
  const [view, setView] = useState<"departamento" | "cliente">("departamento");

  const rawDataDept = departamentos
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map(d => ({ name: d.departamento, value: d.total }));

  const rawDataClients = topClients
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map(c => ({ name: c.name, value: c.total }));

  const rawData = view === "departamento" ? rawDataDept : rawDataClients;
  
  // Para departamentos, mantemos a escala se for o caso, mas para clientes usamos o valor real
  const detalhadaTotal = rawDataDept.reduce((s, d) => s + d.value, 0);
  const scale = (view === "departamento" && detalhadaTotal > 0) ? totalVendas / detalhadaTotal : 1;
  const data = rawData.map((d) => ({ name: d.name, value: d.value * (view === "departamento" ? scale : 1) }));

  return (
    <Card className="border-border bg-card shadow-sm h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-foreground">
            {view === "departamento" ? "Vendas por Departamento" : "Principais Clientes"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {view === "departamento" ? "Distribuição do volume total" : "Maiores compradores do mês"}
          </p>
        </div>
        <div className="flex bg-secondary/50 rounded-lg p-1 border border-border/40">
          <button 
            onClick={() => setView("departamento")}
            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors ${view === "departamento" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Deptos
          </button>
          <button 
            onClick={() => setView("cliente")}
            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors ${view === "cliente" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Clientes
          </button>
        </div>
      </CardHeader>
      <CardContent className="pb-4 flex-1 min-h-[280px]">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground">
            Sem dados disponíveis
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis 
                type="number" 
                tickFormatter={formatCurrencyShort} 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={110} 
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip
                formatter={(value: number) => [
                  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value),
                  "Total"
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
                cursor={{ fill: "hsl(var(--muted)/0.3)" }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {data.map((_, i) => (
                  <Cell key={i} fill={`hsl(188, ${55 - i * 5}%, ${40 + i * 5}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
