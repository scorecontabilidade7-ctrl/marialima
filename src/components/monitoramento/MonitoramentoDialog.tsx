import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonitoramentoAcao, useCreateMonitoramentoAcao, useUpdateMonitoramentoAcao } from "@/hooks/useMonitoramentoAcoes";

interface MonitoramentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acao?: MonitoramentoAcao | null;
  store: string;
}

export default function MonitoramentoDialog({ open, onOpenChange, acao, store }: MonitoramentoDialogProps) {
  const isEditing = !!acao;
  const { mutate: createAcao, isPending: isCreating } = useCreateMonitoramentoAcao();
  const { mutate: updateAcao, isPending: isUpdating } = useUpdateMonitoramentoAcao();
  
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    target_value: "",
  });

  useEffect(() => {
    if (open) {
      if (acao) {
        setFormData({
          name: acao.name,
          start_date: acao.start_date,
          end_date: acao.end_date,
          target_value: acao.target_value.toString(),
        });
      } else {
        setFormData({
          name: "",
          start_date: "",
          end_date: "",
          target_value: "",
        });
      }
    }
  }, [open, acao]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      store,
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      target_value: parseFloat(formData.target_value),
    };

    if (isEditing && acao) {
      updateAcao({ ...payload, id: acao.id }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createAcao(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isPending = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Ação" : "Nova Ação"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Ação</Label>
            <Input 
              id="name" 
              required 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Bazar de Fim de Ano"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data Início</Label>
              <Input 
                id="start_date" 
                type="date" 
                required 
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Data Fim</Label>
              <Input 
                id="end_date" 
                type="date" 
                required 
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_value">Valor da Meta (R$)</Label>
            <Input 
              id="target_value" 
              type="number" 
              step="0.01"
              required 
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
              placeholder="10000.00"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
