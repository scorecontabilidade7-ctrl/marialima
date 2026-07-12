import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, TrendingUp, AlertTriangle, Search, Filter, AlertCircle, DollarSign, Archive, CheckCircle, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useInventoryKPIs, useInventoryAbcReplenishment } from "@/hooks/useInventoryData";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryDataTable from "@/components/dashboard/InventoryDataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PieChart, Pie, Cell, BarChart, Bar, Legend, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

interface EstoqueDashboardProps {
  store?: "sobral" | "itapipoca";
}




export default function EstoqueDashboard() {
  const [searchParams] = useSearchParams();
  const store = (searchParams.get("store") as "sobral" | "itapipoca") || "sobral";
  const navigate = useNavigate();

  const { session, loading: authLoading } = useAuth();
  const { hasStoreAccess, loading: accessLoading, isAdmin } = useUserAccess();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("Todos");

  const { data: kpis, isLoading: kpisLoading } = useInventoryKPIs(store);
  
  const { data: abcData, isLoading: abcLoading } = useInventoryAbcReplenishment(store, 30);

  const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  const formatCompactCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(val);

  const filteredAbc = useMemo(() => {
    if (!abcData) return [];
    return abcData.filter(item => {
      const matchSearch = item.produto.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.ean.includes(searchTerm) ||
                          item.marca?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === "Todos" || item.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [abcData, searchTerm, filterStatus]);

  // Generate Data for Pie Chart (Curva ABC)
  const pieData = useMemo(() => {
    if (!abcData) return [];
    const data = [
      { name: "Curva A", value: 0, color: "#3b82f6" },
      { name: "Curva B", value: 0, color: "#10b981" },
      { name: "Curva C", value: 0, color: "#f59e0b" },
      { name: "Sem Venda", value: 0, color: "#64748b" }
    ];
    abcData.forEach(item => {
      if (item.curva_abc === "A") data[0].value += item.custo_total;
      else if (item.curva_abc === "B") data[1].value += item.custo_total;
      else if (item.curva_abc === "C") data[2].value += item.custo_total;
      else data[3].value += item.custo_total;
    });
    return data.filter(d => d.value > 0);
  }, [abcData]);

  // Generate Data for Bar Chart (Status)
  const barData = useMemo(() => {
    if (!abcData) return [];
    const statusMap = {
      "Ruptura Crítica": 0,
      "Atenção": 0,
      "Estoque Saudável": 0,
      "Regular": 0,
      "Excesso de Estoque": 0,
      "Bazar (Obsoleto)": 0,
    };
    abcData.forEach(item => {
      if (statusMap[item.status] !== undefined) {
        statusMap[item.status] += item.custo_total;
      }
    });
    
    return [
      { name: "Ruptura", value: statusMap["Ruptura Crítica"], color: "#ef4444" },
      { name: "Atenção", value: statusMap["Atenção"], color: "#eab308" },
      { name: "Saudável", value: statusMap["Estoque Saudável"], color: "#22c55e" },
      { name: "Regular", value: statusMap["Regular"], color: "#94a3b8" },
      { name: "Excesso", value: statusMap["Excesso de Estoque"], color: "#3b82f6" },
      { name: "Bazar", value: statusMap["Bazar (Obsoleto)"], color: "#a855f7" }
    ].filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [abcData]);

  if (authLoading || accessLoading) {
    return <div className="min-h-screen flex items-center justify-center p-8"><p className="text-muted-foreground">Carregando…</p></div>;
  }
  
  if (!session || !hasStoreAccess(store as any)) {
    return <div className="min-h-screen flex items-center justify-center p-8"><p className="text-muted-foreground">Acesso negado.</p></div>;
  }

  const isLoading = kpisLoading || abcLoading;

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full bg-background/50">
      {/* Header */}
      <header className="border-b border-border/60 px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between shrink-0 bg-card gap-3 md:gap-0">
        <div className="hidden md:block">
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-bold text-foreground tracking-tight">Inteligência de Estoque</h1>
            <span className="text-base font-light text-muted-foreground/50">|</span>
            <span className="text-sm font-semibold text-primary">Maria Lima</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Análise de curva ABC, reposição e itens obsoletos.
          </p>
        </div>
        <div className="flex w-full md:w-auto items-center border border-border rounded-lg overflow-hidden text-xs font-medium">
          <button
            onClick={() => navigate("/estoque?store=sobral")}
            className={`flex-1 md:flex-none px-3.5 py-2 md:py-1.5 transition-colors ${
              store === "sobral" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            Sobral
          </button>
          <button
            onClick={() => navigate("/estoque?store=itapipoca")}
            className={`flex-1 md:flex-none px-3.5 py-2 md:py-1.5 transition-colors ${
              store === "itapipoca" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            Itapipoca
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto px-4 md:px-6 py-5 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <>
                        <Tabs defaultValue="gerencial" className="w-full space-y-6">
              <div className="flex justify-center md:justify-start">
                <TabsList className="bg-secondary/50 border border-border p-1 h-auto">
                  <TabsTrigger value="gerencial" className="data-[state=active]:bg-background px-4 py-2 text-xs font-medium rounded-md">Visão Gerencial</TabsTrigger>
                  <TabsTrigger value="completa" className="data-[state=active]:bg-background px-4 py-2 text-xs font-medium rounded-md">Listagem Completa</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="gerencial" className="space-y-6 mt-0 focus-visible:outline-none focus-visible:ring-0">
                {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Valor em Estoque (Custo)</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{formatCurrency(kpis?.total_cost_value || 0)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Capital investido parado</p>
              </div>
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Valor Potencial (Venda)</span>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-green-500">{formatCurrency(kpis?.total_sale_value || 0)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Faturamento bruto estimado</p>
              </div>
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total de Peças Físicas</span>
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{kpis?.total_items_qty?.toLocaleString('pt-BR') || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Soma de todas as quantidades</p>
              </div>
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Variedade (SKUs)</span>
                  <Filter className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{kpis?.unique_skus?.toLocaleString('pt-BR') || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Códigos de barra únicos</p>
              </div>
            </div>


            {/* Gráficos ABC e Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground">Composição por Curva ABC (Custo)</h3>
                  <p className="text-xs text-muted-foreground">Distribuição financeira do estoque atual.</p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value) => [formatCurrency(Number(value)), "Valor em Estoque"]}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground">Distribuição por Status (Custo)</h3>
                  <p className="text-xs text-muted-foreground">Volume financeiro alocado em cada classificação de saúde.</p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      layout="vertical"
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        type="number" 
                        tickFormatter={(value) => formatCompactCurrency(value)} 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={65} 
                        tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <RechartsTooltip 
                        formatter={(value) => [formatCurrency(Number(value)), "Valor (Custo)"]}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={32}>
                        {barData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>


            {/* Tabela de Ação / Reposição */}
            <div className="bg-card border border-border/60 rounded-xl shadow-sm flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-border/60 space-y-4">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <h3 className="font-semibold text-foreground">Ações de Reposição e Giro (Últimos 30 Dias)</h3>
                    <p className="text-xs text-muted-foreground">Análise de ruptura, curva ABC e sugestão de bazar.</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors">
                        <HelpCircle className="w-4 h-4" />
                        Como funciona?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Como o Status é calculado?</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 text-sm text-muted-foreground">
                        <p>O sistema cruza as vendas dos últimos 30 dias com o estoque atual. Em seguida, calcula a Curva ABC (produtos 'A' representam 80% do faturamento).</p>
                        <ul className="space-y-2 list-disc pl-4">
                          <li><strong className="text-red-500">Ruptura Crítica:</strong> Produto da Curva A que tem estoque para durar 15 dias ou menos.</li>
                          <li><strong className="text-yellow-600">Atenção:</strong> Produto da Curva A com estoque para 16 a 30 dias.</li>
                          <li><strong className="text-green-600">Estoque Saudável:</strong> Produtos da Curva A e B com cobertura de 31 a 90 dias.</li>
                          <li><strong className="text-blue-500">Excesso de Estoque:</strong> Produtos com giro tão lento que o estoque atual vai durar mais de 120 dias.</li>
                          <li><strong className="text-purple-500">Bazar (Obsoleto):</strong> Produtos sem vendas recentes (ou há mais de 90 dias). Ideais para queima de estoque.</li>
                        </ul>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por produto, marca ou EAN..." 
                      className="pl-9 h-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                    {["Todos", "Ruptura Crítica", "Atenção", "Bazar (Obsoleto)", "Estoque Saudável", "Excesso de Estoque"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                          filterStatus === status 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto flex-1 max-h-[600px]">
                <table className="w-full text-sm text-left relative">
                  <thead className="text-xs uppercase bg-secondary text-secondary-foreground border-b border-border/60 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Curva</th>
                      <th className="px-4 py-3 font-semibold">Produto</th>
                      <th className="px-4 py-3 font-semibold text-right">Estoque</th>
                      <th className="px-4 py-3 font-semibold text-right">Média Saída/Dia</th>
                      <th className="px-4 py-3 font-semibold text-right">Dias p/ Acabar</th>
                      <th className="px-4 py-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredAbc.length > 0 ? (
                      filteredAbc.map((item, idx) => {
                        const getStatusColor = (s: string) => {
                          if (s === "Ruptura Crítica") return "bg-red-500/10 text-red-500 border-red-500/20";
                          if (s === "Atenção") return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
                          if (s === "Bazar (Obsoleto)") return "bg-purple-500/10 text-purple-500 border-purple-500/20";
                          if (s === "Estoque Saudável") return "bg-green-500/10 text-green-600 border-green-500/20";
                          if (s === "Excesso de Estoque") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
                          return "bg-secondary text-muted-foreground border-border";
                        };

                        const getStatusIcon = (s: string) => {
                          if (s === "Ruptura Crítica") return <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />;
                          if (s === "Atenção") return <AlertCircle className="w-3.5 h-3.5 mr-1.5" />;
                          if (s === "Bazar (Obsoleto)") return <Archive className="w-3.5 h-3.5 mr-1.5" />;
                          if (s === "Estoque Saudável") return <CheckCircle className="w-3.5 h-3.5 mr-1.5" />;
                          return null;
                        };

                        return (
                          <tr key={`${item.ean}-${idx}`} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                item.curva_abc === 'A' ? 'bg-primary/20 text-primary' : 
                                item.curva_abc === 'B' ? 'bg-blue-500/20 text-blue-500' : 
                                item.curva_abc === 'C' ? 'bg-muted text-muted-foreground' : 'bg-secondary text-muted-foreground/50 text-[10px]'
                              }`}>
                                {item.curva_abc}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground line-clamp-1">{item.produto}</p>
                              <p className="text-xs text-muted-foreground">{item.marca} • EAN: {item.ean}</p>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{item.current_stock.toLocaleString('pt-BR')}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{Number(item.avg_daily_sales).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-medium">
                              {item.days_of_supply === 9999 ? "Infinito" : item.days_of_supply.toLocaleString('pt-BR')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border ${getStatusColor(item.status)}`}>
                                  {getStatusIcon(item.status)}
                                  {item.status}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          Nenhum produto encontrado para este filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
              </TabsContent>

              <TabsContent value="completa" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <InventoryDataTable store={store} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
