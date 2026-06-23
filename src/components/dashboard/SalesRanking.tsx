import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import type { RankingItem } from "@/hooks/useSalesData";
import { useVendedoresConfig } from "@/hooks/useVendedoresConfig";
interface SalesRankingProps {
  ranking: RankingItem[];
  selectedMonth?: { year: number; month: number };
  store?: string;
}

const TEAL = "hsl(188, 55%, 40%)";
const TEAL_LIGHT = "hsl(188, 48%, 88%)";

function formatCurrencyShort(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`;
  return `R$ ${value.toFixed(0)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function SalesRanking({ ranking, selectedMonth, store }: SalesRankingProps) {
  const [viewMode, setViewMode] = useState<"podium" | "list">("podium");
  const navigate = useNavigate();
  const { data: configs } = useVendedoresConfig();

  const data = ranking;
  
  const queryParams = new URLSearchParams();
  if (selectedMonth) {
    queryParams.set("year", String(selectedMonth.year));
    queryParams.set("month", String(selectedMonth.month));
  }
  if (store) queryParams.set("store", store);
  const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : "";
  
  const maxTotal = data[0]?.total || 1;
  const grandTotal = ranking.reduce((s, d) => s + d.total, 0);

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Ranking de Vendedores</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Por volume total de vendas</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex items-center gap-1 bg-secondary/80 rounded-lg p-1 border border-border/50">
              <button
                onClick={() => setViewMode("podium")}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                  viewMode === "podium"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Pódio
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Lista
              </button>
            </div>

            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === "podium" ? (
          <PodiumView ranking={ranking} configs={configs} navigate={navigate} queryStr={queryStr} />
        ) : (
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          {data.map((item, i) => {
            const pct = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
            const barWidth = Math.round((item.total / maxTotal) * 100);
            const config = configs?.find((c) => c.nome_vendedor === item.vendedor);
            const photo = config?.url_foto;
            const firstName = item.vendedor.split(" ")[0];

            return (
              <div
                key={item.vendedor}
                className="flex items-center gap-2 cursor-pointer rounded-md px-1 -mx-1 hover:bg-secondary/60 transition-colors"
                onClick={() => navigate(`/vendedor/${encodeURIComponent(item.vendedor)}${queryStr}`)}
              >
                <span
                  className="text-[11px] font-bold w-5 text-center shrink-0"
                  style={{ color: i === 0 ? TEAL : "hsl(220,10%,55%)" }}
                >
                  #{i + 1}
                </span>

                <div
                  className="w-7 h-7 rounded-full shrink-0 overflow-hidden flex items-center justify-center text-[10px] font-bold"
                  style={{
                    border: `2px solid ${i === 0 ? TEAL : TEAL_LIGHT}`,
                    backgroundColor: TEAL_LIGHT,
                    color: TEAL,
                  }}
                >
                  {photo ? (
                    <img src={photo} alt={firstName} className="w-full h-full object-cover" />
                  ) : (
                    firstName.slice(0, 2).toUpperCase()
                  )}
                </div>

                <span className="text-[12px] text-foreground truncate w-[72px] shrink-0 font-medium">
                  {firstName}
                </span>

                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: TEAL_LIGHT }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: i === 0 ? TEAL : `hsl(188, ${48 - i * 3}%, ${40 + i * 4}%)`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-14 text-right">
                    {formatCurrencyShort(item.total)}
                  </span>
                </div>

                <span
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 w-9 text-center tabular-nums"
                  style={{
                    backgroundColor: i === 0 ? TEAL : TEAL_LIGHT,
                    color: i === 0 ? "#fff" : TEAL,
                  }}
                >
                  {pct}%
                </span>

                <span className="text-[11px] text-primary tabular-nums shrink-0 w-16 text-right font-semibold">
                  {formatCurrency(item.comissao)}
                </span>
              </div>
            );
          })}

          {data.length > 0 && (
            <div className="pt-2 border-t border-border/40 flex justify-between text-[11px] text-muted-foreground">
              <span className="font-medium">Total</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatCurrency(data.reduce((s, d) => s + d.comissao, 0))}
              </span>
            </div>
          )}
        </div>
        )}
      </CardContent>
    </Card>
  );
}

function PodiumView({ ranking, configs, navigate, queryStr }: any) {
  const top3 = ranking.slice(0, 3);
  if (top3.length === 0) return <div className="py-12 text-center text-muted-foreground">Nenhuma venda ainda</div>;

  const podiumOrder = [];
  if (top3[1]) podiumOrder.push({ ...top3[1], pos: 2 });
  if (top3[0]) podiumOrder.push({ ...top3[0], pos: 1 });
  if (top3[2]) podiumOrder.push({ ...top3[2], pos: 3 });

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-6 h-[280px] pt-8 pb-4">
      {podiumOrder.map((item) => {
        const config = configs?.find((c: any) => c.nome_vendedor === item.vendedor);
        const photo = config?.url_foto;
        const firstName = item.vendedor.split(" ")[0];

        const isFirst = item.pos === 1;
        const isSecond = item.pos === 2;

        const height = isFirst ? "h-36" : isSecond ? "h-28" : "h-20";
        const color = isFirst 
          ? "from-amber-400 to-amber-600" 
          : isSecond 
            ? "from-slate-300 to-slate-500" 
            : "from-orange-400 to-orange-700";
        
        const borderColor = isFirst ? "border-amber-400" : isSecond ? "border-slate-300" : "border-orange-400";
        const textColor = isFirst ? "text-amber-500" : isSecond ? "text-slate-400" : "text-orange-500";
        
        // Define an explicit slide-in style instead of dynamic class to ensure it works
        const delay = isFirst ? '200ms' : isSecond ? '400ms' : '600ms';

        return (
          <div 
            key={item.vendedor} 
            className="flex flex-col items-center group cursor-pointer w-20 sm:w-24 relative animate-in slide-in-from-bottom-8 fade-in fill-mode-both"
            style={{ animationDuration: '700ms', animationDelay: delay }}
            onClick={() => navigate(`/vendedor/${encodeURIComponent(item.vendedor)}${queryStr}`)}
          >
            {/* Avatar & Info */}
            <div className={`relative mb-3 flex flex-col items-center z-10`}>
              {isFirst && (
                <Trophy className="w-8 h-8 text-amber-500 absolute -top-10 animate-bounce drop-shadow-md" />
              )}
              <div className={`rounded-full overflow-hidden border-4 ${borderColor} bg-background shadow-xl ${isFirst ? 'w-20 h-20' : 'w-16 h-16'} transition-transform duration-300 group-hover:scale-110 relative`}>
                {photo ? (
                  <img src={photo} alt={firstName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center font-bold text-lg text-muted-foreground">
                    {firstName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="text-center mt-2">
                <p className={`font-bold text-sm ${textColor} truncate max-w-full px-1 drop-shadow-sm`}>{firstName}</p>
                <p className="text-xs font-bold text-foreground drop-shadow-sm">{formatCurrencyShort(item.total)}</p>
              </div>
            </div>

            {/* Pedestal */}
            <div 
              className={`w-full ${height} bg-gradient-to-t ${color} rounded-t-lg shadow-2xl relative overflow-hidden transition-all duration-300 group-hover:brightness-110 opacity-90 border-t border-white/20`}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <span className="text-6xl font-black text-white mix-blend-overlay">{item.pos}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
