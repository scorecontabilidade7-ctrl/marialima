import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RankingItem } from "@/hooks/useSalesData";
import { getSellerPhoto } from "@/lib/sellerPhotos";

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
  const [topN, setTopN] = useState(8);
  const navigate = useNavigate();

  const data = ranking.slice(0, topN);
  
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
          <div className="flex items-center gap-1 border border-border rounded-md overflow-hidden">
            {[5, 8, 10].map((n) => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                className={`px-2 py-1 text-[11px] font-medium transition-colors ${
                  topN === n
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {data.map((item, i) => {
            const pct = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
            const barWidth = Math.round((item.total / maxTotal) * 100);
            const photo = getSellerPhoto(item.vendedor);
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
      </CardContent>
    </Card>
  );
}
