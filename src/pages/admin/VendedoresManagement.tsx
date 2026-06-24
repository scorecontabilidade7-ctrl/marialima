import { useState } from "react";
import { useVendedoresConfig, useDistinctVendedores, useUpsertVendedorConfig, uploadSellerPhoto } from "@/hooks/useVendedoresConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, UploadCloud, Loader2, ArrowLeft } from "lucide-react";
function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function VendedoresManagement() {
  const navigate = useNavigate();
  const { data: configs, isLoading } = useVendedoresConfig();
  const { data: distinctSellers, isLoading: isLoadingSellers } = useDistinctVendedores();
  const { mutateAsync: upsertConfig } = useUpsertVendedorConfig();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState<{ id?: string; nome_vendedor: string; url_foto: string | null }>({
    nome_vendedor: "",
    url_foto: null,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const openEdit = (config: { id: string; nome_vendedor: string; url_foto: string | null }) => {
    setFormData({ id: config.id, nome_vendedor: config.nome_vendedor, url_foto: config.url_foto });
    setSelectedFile(null);
    setPreviewUrl(config.url_foto);
    setIsOpen(true);
  };

  const openCreate = () => {
    setFormData({ nome_vendedor: "", url_foto: null });
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!formData.nome_vendedor) {
      toast.error("Selecione o vendedor");
      return;
    }

    try {
      setIsUploading(true);
      let photoUrl = formData.url_foto;

      if (selectedFile) {
        photoUrl = await uploadSellerPhoto(selectedFile);
      }

      await upsertConfig({
        id: formData.id,
        nome_vendedor: formData.nome_vendedor,
        url_foto: photoUrl,
      });

      toast.success("Configuração salva com sucesso!");
      setIsOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar configuração");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Carregando vendedores...</div>;
  }

  return (
    <div className="h-full overflow-y-auto space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Vendedores</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure as fotos e perfil dos vendedores para o Dashboard.
          </p>
        </div>
      </div>
      
      <div className="flex justify-end">
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Vendedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{formData.id ? "Editar Vendedor" : "Novo Vendedor"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Vendedor (Gigatech)</Label>
                <Select
                  value={formData.nome_vendedor}
                  onValueChange={(val) => setFormData({ ...formData, nome_vendedor: val })}
                  disabled={!!formData.id || isLoadingSellers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {distinctSellers?.map((seller) => (
                      <SelectItem key={seller} value={seller}>
                        {seller}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.id && <p className="text-xs text-muted-foreground">Não é possível alterar o nome de um vendedor já vinculado.</p>}
              </div>

              <div className="space-y-2">
                <Label>Foto do Perfil</Label>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border/50 bg-secondary flex items-center justify-center relative group">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-muted-foreground text-2xl font-bold">
                        {formData.nome_vendedor ? getInitials(formData.nome_vendedor) : "?"}
                      </span>
                    )}
                    <label className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center text-xs font-semibold backdrop-blur-sm">
                      <UploadCloud className="w-5 h-5 mb-1" />
                      Alterar
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                  {!previewUrl && (
                    <label className="text-sm text-primary cursor-pointer hover:underline font-medium">
                      Fazer upload da foto
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  )}
                </div>
              </div>

              <Button onClick={handleSave} className="w-full mt-4" disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isUploading ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {configs?.map((config) => (
          <Card key={config.id} className="overflow-hidden hover:shadow-md transition-shadow group">
            <CardContent className="p-0">
              <div className="p-6 flex flex-col items-center text-center relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => openEdit(config)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                
                <div className="w-20 h-20 rounded-full border-4 border-background shadow-sm overflow-hidden bg-secondary flex items-center justify-center text-2xl font-bold text-muted-foreground mb-4">
                  {config.url_foto ? (
                    <img src={config.url_foto} alt={config.nome_vendedor} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(config.nome_vendedor)
                  )}
                </div>
                <h3 className="font-semibold text-lg leading-tight mb-1">{config.nome_vendedor}</h3>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Vendedor
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {configs?.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Nenhum vendedor configurado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
