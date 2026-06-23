import { useMemo, useState } from "react";
import { useMonthlyGoals, useUpsertGoal } from "@/hooks/useMonthlyGoals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { BR_TIME_ZONE, getDatePartsInTimeZone } from "@/lib/utils";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatYearMonth(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

type DistributionMode = "uniform" | "week" | "day";

type WeekSpec = { label: string; days: Date[] };

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface GoalForm {
  year_month: string;
  meta_minima: string;
  meta_top1: string;
  meta_top2: string;
  meta_master: string;
  dias_uteis: string;
  distribution_mode: DistributionMode;
  distribution_week: string[];
  distribution_day: string[];
}

function parseYearMonth(ym: string) {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null;
  return { year: y, monthIndex: m - 1 };
}

function calcDiasUteis(year: number, monthIndex: number) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const day = new Date(Date.UTC(year, monthIndex, d)).getUTCDay();
    if (day !== 0) count++;
  }
  return count;
}

function calcDiasUteisFromYearMonth(ym: string) {
  const parts = parseYearMonth(ym);
  if (!parts) return 0;
  return calcDiasUteis(parts.year, parts.monthIndex);
}

function getWeeksOfMonth(year: number, monthIndex: number): WeekSpec[] {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const weeks: WeekSpec[] = [];
  let current: Date[] = [];

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(Date.UTC(year, monthIndex, day));
    const weekday = date.getUTCDay();
    if (weekday === 0) continue;

    current.push(date);

    const isLastDay = day === lastDay;
    const isEndOfWeek = weekday === 6;
    if (isEndOfWeek || isLastDay) {
      const start = current[0];
      const end = current[current.length - 1];
      const label = `${String(start.getUTCDate()).padStart(2, "0")}/${String(monthIndex + 1).padStart(2, "0")} - ${String(end.getUTCDate()).padStart(2, "0")}/${String(monthIndex + 1).padStart(2, "0")}`;
      weeks.push({ label, days: current });
      current = [];
    }
  }

  return weeks;
}

function getWeeksFromYearMonth(ym: string) {
  const parts = parseYearMonth(ym);
  if (!parts) return [] as WeekSpec[];
  return getWeeksOfMonth(parts.year, parts.monthIndex);
}

function equalSplit(parts: number) {
  if (parts <= 0) return [] as string[];
  const base = Math.floor((100 / parts) * 100) / 100;
  const values = Array.from({ length: parts }, () => base);
  const remainder = Math.round((100 - values.reduce((s, v) => s + v, 0)) * 100) / 100;
  values[values.length - 1] = Math.round((values[values.length - 1] + remainder) * 100) / 100;
  return values.map((v) => String(v));
}

const GOALS_STORAGE_KEY = "goals_last_values";

type SavedGoalValues = Pick<GoalForm, "meta_minima" | "meta_top1" | "meta_top2" | "meta_master" | "dias_uteis">;

function loadSavedGoalValues(): SavedGoalValues {
  try {
    const saved = localStorage.getItem(GOALS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { meta_minima: "90000", meta_top1: "110000", meta_top2: "130000", meta_master: "150000", dias_uteis: "24" };
}

function saveGoalValues(form: GoalForm) {
  try {
    const values: SavedGoalValues = {
      meta_minima: form.meta_minima,
      meta_top1: form.meta_top1,
      meta_top2: form.meta_top2,
      meta_master: form.meta_master,
      dias_uteis: form.dias_uteis,
    };
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(values));
  } catch {}
}

const emptyForm = (): GoalForm => {
  const now = new Date();
  const saved = loadSavedGoalValues();
  const { year, month } = getDatePartsInTimeZone(now, BR_TIME_ZONE);
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  const weeks = getWeeksFromYearMonth(yearMonth);
  return {
    year_month: yearMonth,
    ...saved,
    distribution_mode: "uniform",
    distribution_week: equalSplit(Math.max(1, weeks.length)),
    distribution_day: equalSplit(6),
  };
};

const STORES = [
  { key: "sobral", label: "Sobral" },
  { key: "itapipoca", label: "Itapipoca" },
] as const;

export default function GoalsManagement() {
  const [activeStore, setActiveStore] = useState<"sobral" | "itapipoca">("sobral");
  const { data: goals, isLoading } = useMonthlyGoals(activeStore);
  const upsert = useUpsertGoal();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<GoalForm>(emptyForm());

  const diasUteisSugeridos = useMemo(() => {
    const v = calcDiasUteisFromYearMonth(form.year_month);
    return v > 0 ? v : 24;
  }, [form.year_month]);

  const diasUteisEfetivos = useMemo(() => {
    const v = parseInt(form.dias_uteis);
    return Number.isFinite(v) && v > 0 ? v : Math.max(1, diasUteisSugeridos);
  }, [form.dias_uteis, diasUteisSugeridos]);

  const weeks = useMemo(() => getWeeksFromYearMonth(form.year_month), [form.year_month]);

  const metaDiariaPreview = useMemo(() => {
    const minima = (parseFloat(form.meta_minima) || 0) / diasUteisEfetivos;
    const top1 = (parseFloat(form.meta_top1) || 0) / diasUteisEfetivos;
    const top2 = (parseFloat(form.meta_top2) || 0) / diasUteisEfetivos;
    const master = (parseFloat(form.meta_master) || 0) / diasUteisEfetivos;
    return { minima, top1, top2, master };
  }, [form.meta_minima, form.meta_top1, form.meta_top2, form.meta_master, diasUteisEfetivos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const mode = form.distribution_mode;
    let distribution_percentages: number[] | null = null;

    if (mode === "week") {
      const expectedLen = Math.max(1, weeks.length);
      const nums = form.distribution_week.map((v) => Number(v));
      if (nums.length !== expectedLen || nums.some((n) => !Number.isFinite(n) || n < 0)) {
        toast.error("Percentuais por semana inválidos");
        return;
      }
      const total = nums.reduce((s, n) => s + n, 0);
      if (Math.abs(total - 100) > 0.01) {
        toast.error("Percentuais por semana devem somar 100%");
        return;
      }
      distribution_percentages = nums;
    }

    if (mode === "day") {
      const nums = form.distribution_day.map((v) => Number(v));
      if (nums.length !== 6 || nums.some((n) => !Number.isFinite(n) || n < 0)) {
        toast.error("Percentuais por dia inválidos");
        return;
      }
      const total = nums.reduce((s, n) => s + n, 0);
      if (Math.abs(total - 100) > 0.01) {
        toast.error("Percentuais por dia devem somar 100%");
        return;
      }
      distribution_percentages = nums;
    }

    try {
      await upsert.mutateAsync({
        year_month: form.year_month,
        store: activeStore,
        meta_minima: parseFloat(form.meta_minima),
        meta_top1: parseFloat(form.meta_top1),
        meta_top2: parseFloat(form.meta_top2),
        meta_master: parseFloat(form.meta_master),
        dias_uteis: parseInt(form.dias_uteis),
        distribution_mode: mode,
        distribution_percentages,
      } as any);
      saveGoalValues(form);
      toast.success("Meta salva com sucesso!");
      setOpen(false);
      setForm(emptyForm());
    } catch (err: any) {
      toast.error("Erro ao salvar meta", { description: err.message });
    }
  };

  const editGoal = (g: any) => {
    const yearMonth = String(g.year_month);
    const w = getWeeksFromYearMonth(yearMonth);
    const mode = (g.distribution_mode as DistributionMode | undefined) ?? "uniform";
    const dist = Array.isArray(g.distribution_percentages) ? g.distribution_percentages : null;

    const weekPercents = mode === "week" && dist ? dist.slice(0, w.length).map(String) : equalSplit(Math.max(1, w.length));
    const dayPercents = mode === "day" && dist && dist.length === 6 ? dist.map(String) : equalSplit(6);

    setForm({
      year_month: yearMonth,
      meta_minima: String(g.meta_minima),
      meta_top1: String(g.meta_top1),
      meta_top2: String(g.meta_top2),
      meta_master: String(g.meta_master),
      dias_uteis: String(g.dias_uteis),
      distribution_mode: mode,
      distribution_week: weekPercents,
      distribution_day: dayPercents,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Gestão de Metas</h2>
          <p className="text-sm text-muted-foreground mt-1">Cadastre metas mensais da loja</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border rounded-lg overflow-hidden text-xs font-medium">
            {STORES.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveStore(s.key)}
                className={`px-3.5 py-1.5 transition-colors ${
                  activeStore === s.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(emptyForm())}>
              <Plus className="w-4 h-4 mr-2" /> Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Meta Mensal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Mês/Ano</Label>
                <Input
                  type="month"
                  value={form.year_month}
                  onChange={(e) => {
                    const ym = e.target.value;
                    const nextWeeks = getWeeksFromYearMonth(ym);
                    setForm((prev) => ({
                      ...prev,
                      year_month: ym,
                      dias_uteis: String(calcDiasUteisFromYearMonth(ym) || prev.dias_uteis),
                      distribution_week: prev.distribution_week.length === nextWeeks.length ? prev.distribution_week : equalSplit(Math.max(1, nextWeeks.length)),
                    }));
                  }}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Distribuição da meta</Label>
                <Select
                  value={form.distribution_mode}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, distribution_mode: v as DistributionMode }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uniform">Uniforme (automático)</SelectItem>
                    <SelectItem value="week">Por semana (%)</SelectItem>
                    <SelectItem value="day">Por dia (seg–sáb) (%)</SelectItem>
                  </SelectContent>
                </Select>

                {form.distribution_mode === "week" && (
                  <div className="rounded-md border border-border/60 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">Percentual por semana (soma 100%)</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setForm((prev) => ({ ...prev, distribution_week: equalSplit(Math.max(1, weeks.length)) }))}
                      >
                        Dividir igualmente
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {weeks.map((w, i) => (
                        <div key={w.label} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{w.label}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            value={form.distribution_week[i] ?? ""}
                            onChange={(e) =>
                              setForm((prev) => {
                                const next = [...prev.distribution_week];
                                next[i] = e.target.value;
                                return { ...prev, distribution_week: next };
                              })
                            }
                            placeholder="%"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Total: {form.distribution_week.reduce((s, v) => s + (Number(v) || 0), 0).toFixed(2)}%
                    </p>
                  </div>
                )}

                {form.distribution_mode === "day" && (
                  <div className="rounded-md border border-border/60 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">Percentual por dia da semana (soma 100%)</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setForm((prev) => ({ ...prev, distribution_day: equalSplit(6) }))}
                      >
                        Dividir igualmente
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {WEEKDAY_LABELS.map((label, i) => (
                        <div key={label} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{label}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            value={form.distribution_day[i] ?? ""}
                            onChange={(e) =>
                              setForm((prev) => {
                                const next = [...prev.distribution_day];
                                next[i] = e.target.value;
                                return { ...prev, distribution_day: next };
                              })
                            }
                            placeholder="%"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Total: {form.distribution_day.reduce((s, v) => s + (Number(v) || 0), 0).toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meta Mínima (R$)</Label>
                  <Input
                    type="number"
                    value={form.meta_minima}
                    onChange={(e) => setForm({ ...form, meta_minima: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Top 1 (R$)</Label>
                  <Input
                    type="number"
                    value={form.meta_top1}
                    onChange={(e) => setForm({ ...form, meta_top1: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Top 2 (R$)</Label>
                  <Input
                    type="number"
                    value={form.meta_top2}
                    onChange={(e) => setForm({ ...form, meta_top2: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Master (R$)</Label>
                  <Input
                    type="number"
                    value={form.meta_master}
                    onChange={(e) => setForm({ ...form, meta_master: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Dias Úteis</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setForm((prev) => ({ ...prev, dias_uteis: String(diasUteisSugeridos) }))}
                  >
                    Usar sugerido ({diasUteisSugeridos})
                  </Button>
                </div>
                <Input
                  type="number"
                  value={form.dias_uteis}
                  onChange={(e) => setForm({ ...form, dias_uteis: e.target.value })}
                  required
                  min={1}
                />
                <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs font-medium text-foreground">Prévia — Meta diária (Loja)</p>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Miníma: <span className="font-semibold text-foreground">{formatBRL(metaDiariaPreview.minima)}</span></div>
                    <div>Top 1: <span className="font-semibold text-foreground">{formatBRL(metaDiariaPreview.top1)}</span></div>
                    <div>Top 2: <span className="font-semibold text-foreground">{formatBRL(metaDiariaPreview.top2)}</span></div>
                    <div>Master: <span className="font-semibold text-foreground">{formatBRL(metaDiariaPreview.master)}</span></div>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Base: metas mensais ÷ {diasUteisEfetivos} dia(s) útil(eis) (seg–sáb)
                  </p>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={upsert.isPending}>
                {upsert.isPending ? "Salvando..." : "Salvar Meta"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Metas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sidebar text-sidebar-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Mês</th>
                  <th className="text-right px-4 py-2.5 font-medium">Mínima</th>
                  <th className="text-right px-4 py-2.5 font-medium">Top 1</th>
                  <th className="text-right px-4 py-2.5 font-medium">Top 2</th>
                  <th className="text-right px-4 py-2.5 font-medium">Master</th>
                  <th className="text-right px-4 py-2.5 font-medium">Dias Úteis</th>
                  <th className="text-center px-4 py-2.5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
                ) : !goals?.length ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma meta cadastrada</td></tr>
                ) : (
                  goals.map((g) => (
                    <tr key={g.id} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">{formatYearMonth(g.year_month)}</td>
                      <td className="text-right px-4 py-2.5">{formatBRL(g.meta_minima)}</td>
                      <td className="text-right px-4 py-2.5">{formatBRL(g.meta_top1)}</td>
                      <td className="text-right px-4 py-2.5">{formatBRL(g.meta_top2)}</td>
                      <td className="text-right px-4 py-2.5">{formatBRL(g.meta_master)}</td>
                      <td className="text-right px-4 py-2.5">{g.dias_uteis}</td>
                      <td className="text-center px-4 py-2.5">
                        <Button variant="ghost" size="sm" onClick={() => editGoal(g)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
