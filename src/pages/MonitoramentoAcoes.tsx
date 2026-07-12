import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, TrendingUp, Target, DollarSign, Percent } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserAccess } from "@/hooks/useUserAccess";
import { MonitoramentoAcao, useMonitoramentoAcoes, useDeleteMonitoramentoAcao } from "@/hooks/useMonitoramentoAcoes";
import { Skeleton } from "@/components/ui/skeleton";
import { BR_TIME_ZONE, formatTimeHMInTimeZone, getDatePartsInTimeZone } from "@/lib/utils";
import MonitoramentoDialog from "@/components/monitoramento/MonitoramentoDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LabelList } from "recharts";

import { Button } from "@/components/ui/button";

interface MonitoramentoAcoesProps {
  store?: "sobral" | "itapipoca";
}

export default function MonitoramentoAcoes() {
  const [searchParams] = useSearchParams();
  const store = (searchParams.get("store") as "sobral" | "itapipoca") || "sobral";

  const now = new Date();
  const { year: currentYear, month: currentMonth } = getDatePartsInTimeZone(now, BR_TIME_ZONE);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = sessionStorage.getItem("monitoramentoSelectedMonth");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { year: currentYear, month: currentMonth };
  });

  useEffect(() => {
    sessionStorage.setItem("monitoramentoSelectedMonth", JSON.stringify(selectedMonth));
  }, [selectedMonth]);

  const { session, loading: authLoading } = useAuth();
  const { hasStoreAccess, loading: accessLoading, isAdmin } = useUserAccess();
  const navigate = useNavigate();

  const { data: acoes, isLoading, error } = useMonitoramentoAcoes(store, selectedMonth.year, selectedMonth.month);
  const { mutate: deleteAcao } = useDeleteMonitoramentoAcao();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [acaoToEdit, setAcaoToEdit] = useState<any>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [acaoToDelete, setAcaoToDelete] = useState<any>(null);


  const goToPrevMonth = () => {
    setSelectedMonth((prev: any) => {
      if (prev.month === 1) return { year: prev.year - 1, month: 12 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };
  
  const goToNextMonth = () => {
    setSelectedMonth((prev: any) => {
      if (prev.month === 12) return { year: prev.year + 1, month: 1 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };
  
  const isCurrentMonth = selectedMonth.year === currentYear && selectedMonth.month === currentMonth;

  const selectedMonthLabel = new Date(selectedMonth.year, selectedMonth.month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const handleEdit = (acao: any) => {
    setAcaoToEdit(acao);
    setDialogOpen(true);
  };

  const handleDeleteClick = (acao: any) => {
    setAcaoToDelete(acao);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (acaoToDelete) {
      deleteAcao({ id: acaoToDelete.id, store });
      setDeleteDialogOpen(false);
      setAcaoToDelete(null);
    }
  };


  const handleCreate = () => {
    setAcaoToEdit(null);
    setDialogOpen(true);
  };

  const kpis = useMemo(() => {
    if (!acoes) return { totalTarget: 0, totalRealized: 0, count: 0 };
    return acoes.reduce((acc, acao) => {
      acc.totalTarget += acao.target_value;
      acc.totalRealized += (acao.realized_value || 0);
      acc.count += 1;
      return acc;
    }, { totalTarget: 0, totalRealized: 0, count: 0 });
  }, [acoes]);

  const diff = kpis.totalRealized - kpis.totalTarget;
  const perc = kpis.totalTarget > 0 ? (kpis.totalRealized / kpis.totalTarget) * 100 : 0;

  const chartData = useMemo(() => {
    if (!acoes) return [];

    const sortedAcoes = [...acoes].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    return sortedAcoes.map(a => {
      const dStart = new Date(a.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
      const dEnd = new Date(a.end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
      
      return {
        name: `${a.name} - ${dStart} a ${dEnd}`,
        Meta: a.target_value,
        Realizado: a.realized_value || 0,
      };
    });
  }, [acoes]);

  if (authLoading || accessLoading) {
    return <div className="min-h-screen flex items-center justify-center p-8"><p className="text-muted-foreground">Carregando…</p></div>;
  }
  
  if (!session || !hasStoreAccess(store as any)) {
    return <div className="min-h-screen flex items-center justify-center p-8"><p className="text-muted-foreground">Acesso negado.</p></div>;
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full">
      {/* Header */}
      <header className="border-b border-border/60 px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between shrink-0 bg-card gap-3 md:gap-0">
        <div className="hidden md:block">
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-bold text-foreground tracking-tight">Monitoramento de Ações</h1>
            <span className="text-base font-light text-muted-foreground/50">|</span>
            <span className="text-sm font-semibold text-primary">Maria Lima</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controle interno e acompanhamento de metas.
          </p>
        </div>
        <div className="flex w-full md:w-auto items-center border border-border rounded-lg overflow-hidden text-xs font-medium">
          <button
            onClick={() => navigate("/monitoramento-acoes?store=sobral")}
            className={`flex-1 md:flex-none px-3.5 py-2 md:py-1.5 transition-colors ${
              store === "sobral" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            Sobral
          </button>
          <button
            onClick={() => navigate("/monitoramento-acoes?store=itapipoca")}
            className={`flex-1 md:flex-none px-3.5 py-2 md:py-1.5 transition-colors ${
              store === "itapipoca" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            Itapipoca
          </button>
        </div>
        <div className="text-right hidden md:block">
            <div className="flex items-center justify-end gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground tabular-nums">
                {new Date().toLocaleDateString("pt-BR", {
                  timeZone: BR_TIME_ZONE, day: "2-digit", month: "long", year: "numeric",
                })}
              </span>
            </div>
        </div>
      </header>

      <div className="sticky top-0 z-40 border-b border-border/40 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Mês</label>
            <div className="flex items-center gap-1 h-9 border border-border rounded-md bg-secondary px-1">
              <button onClick={goToPrevMonth} className="p-1 rounded hover:bg-accent transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
              <span className="text-sm font-medium w-32 text-center capitalize tabular-nums select-none">{selectedMonthLabel}</span>
              <button onClick={goToNextMonth} disabled={isCurrentMonth} className="p-1 rounded hover:bg-accent transition-colors disabled:opacity-30"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={handleCreate} className="gap-2 h-9">
              <Plus className="w-4 h-4" /> Nova Ação
            </Button>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-auto px-4 md:px-6 py-5 space-y-5">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : error ? (
          <div className="text-destructive">Erro ao carregar dados: {error.message}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total da Meta</span>
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{formatCurrency(kpis.totalTarget)}</span>
                </div>
              </div>
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total Realizado</span>
                  <DollarSign className="w-4 h-4 text-green-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{formatCurrency(kpis.totalRealized)}</span>
                </div>
              </div>
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Diferença</span>
                  <TrendingUp className={`w-4 h-4 ${diff >= 0 ? "text-green-500" : "text-destructive"}`} />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-2xl font-bold tracking-tight ${diff >= 0 ? "text-green-500" : "text-destructive"}`}>
                    {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                  </span>
                </div>
              </div>
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Atingimento</span>
                  <Percent className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{perc.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {chartData.length > 0 && (
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-foreground">Comparativo por Ação</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={0}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(val) => `R$ ${val / 1000}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Bar dataKey="Meta" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        <LabelList 
                          dataKey="Meta" 
                          position="top" 
                          formatter={(val: number) => `R$\u00A0${(val / 1000).toFixed(1).replace('.', ',')}k`} 
                          fill="hsl(var(--muted-foreground))" 
                          fontSize={11} 
                        />
                      </Bar>
                      <Bar dataKey="Realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        <LabelList 
                          dataKey="Realizado" 
                          position="top" 
                          formatter={(val: number) => `R$\u00A0${(val / 1000).toFixed(1).replace('.', ',')}k`} 
                          fill="hsl(var(--primary))" 
                          fontSize={11} 
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border/60">
                <h3 className="font-semibold text-foreground">Listagem de Ações</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Nome</th>
                      <th className="px-5 py-3 font-semibold">Período</th>
                      <th className="px-5 py-3 font-semibold text-right">Meta</th>
                      <th className="px-5 py-3 font-semibold text-right">Realizado</th>
                      <th className="px-5 py-3 font-semibold text-right">Diferença</th>
                      <th className="px-5 py-3 font-semibold text-right">%</th>
                      {isAdmin && <th className="px-5 py-3 font-semibold text-center">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {acoes && acoes.length > 0 ? (
                      acoes.map((acao) => {
                        const d = (acao.realized_value || 0) - acao.target_value;
                        const p = acao.target_value > 0 ? ((acao.realized_value || 0) / acao.target_value) * 100 : 0;
                        return (
                          <tr key={acao.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-5 py-3 font-medium text-foreground">{acao.name}</td>
                            <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                              {new Date(acao.start_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - {new Date(acao.end_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                            </td>
                            <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(acao.target_value)}</td>
                            <td className="px-5 py-3 text-right tabular-nums font-medium text-foreground">{formatCurrency(acao.realized_value || 0)}</td>
                            <td className={`px-5 py-3 text-right tabular-nums font-medium ${d >= 0 ? "text-green-500" : "text-destructive"}`}>
                              {d >= 0 ? "+" : ""}{formatCurrency(d)}
                            </td>
                            <td className="px-5 py-3 text-right tabular-nums font-bold">
                              {p.toFixed(1)}%
                            </td>
                            {isAdmin && (
                              <td className="px-5 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => handleEdit(acao)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteClick(acao)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="px-5 py-8 text-center text-muted-foreground">
                          Nenhuma ação cadastrada para este mês.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      <MonitoramentoDialog open={dialogOpen} onOpenChange={setDialogOpen} acao={acaoToEdit} store={store} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente a ação <strong>"{acaoToDelete?.name}"</strong>. Esta operação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar Ação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
