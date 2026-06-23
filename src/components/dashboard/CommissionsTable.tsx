import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Vendedor } from "@/hooks/useSalesData";

interface CommissionsTableProps {
  vendedores: Vendedor[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600",
  "bg-purple-600", "bg-teal-600", "bg-orange-600", "bg-indigo-600",
];

interface AggRow {
  vendedor: string;
  totalVendas: number;
  comissaoVendedor: number;
}

export default function CommissionsTable({ vendedores }: CommissionsTableProps) {
  const grouped = vendedores.reduce<Record<string, AggRow>>((acc, v) => {
    const key = v.vendedor || "Desconhecido";
    if (!acc[key]) {
      acc[key] = { vendedor: key, totalVendas: 0, comissaoVendedor: 0 };
    }
    acc[key].totalVendas += v.valor_total || 0;
    acc[key].comissaoVendedor += v.comissao_vendedor || 0;
    return acc;
  }, {});

  const data = Object.values(grouped).sort((a, b) => b.totalVendas - a.totalVendas);

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Comissões por Vendedor</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs font-medium">Vendedor</TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium text-right">Total Vendas</TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium text-right">Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => {
              const photo = row.url_foto;
              return (
                <TableRow key={row.vendedor} className="border-border/60 hover:bg-secondary/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-[10px] font-bold shrink-0 overflow-hidden`}>
                        {photo
                          ? <img src={photo} alt={row.vendedor} className="w-full h-full object-cover" />
                          : getInitials(row.vendedor)
                        }
                      </div>
                      <span className="font-medium text-sm">{row.vendedor}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{formatCurrency(row.totalVendas)}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums text-primary">{formatCurrency(row.comissaoVendedor)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
