import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  X, 
  Camera,
  FileImage,
  Zap
} from "lucide-react";
import { uploads } from "@/lib/api/client";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onImageUploaded?: () => void;
}

export function ImageUploadModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  onImageUploaded,
}: ImageUploadModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    tooth: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    category: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageTypes = [
    { value: "xray", label: "Radiografia", icon: Zap },
    { value: "photo", label: "Fotografia", icon: Camera },
    { value: "scan", label: "Escaneamento", icon: FileImage },
    { value: "document", label: "Documento", icon: FileText },
  ];

  const categories = [
    "Diagnóstico",
    "Antes do Tratamento",
    "Durante o Tratamento",
    "Após o Tratamento",
    "Controle",
    "Exame",
    "Documento",
    "Outros",
  ];

  const teeth = [
    // Adult teeth numbering
    ...Array.from({ length: 16 }, (_, i) => `${i + 11}`),
    ...Array.from({ length: 16 }, (_, i) => `${i + 21}`),
    ...Array.from({ length: 16 }, (_, i) => `${i + 31}`),
    ...Array.from({ length: 16 }, (_, i) => `${i + 41}`),
    "Todos",
    "Arcada Superior",
    "Arcada Inferior",
    "Quadrante 1",
    "Quadrante 2",
    "Quadrante 3",
    "Quadrante 4",
    "N/A",
  ];

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "application/pdf"];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast.error("Apenas imagens (JPEG, PNG, GIF) e PDFs são permitidos");
      return;
    }

    // Validate file sizes (max 10MB per file)
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    
    if (oversizedFiles.length > 0) {
      toast.error("Cada arquivo deve ter no máximo 10MB");
      return;
    }

    // Limit to 5 files maximum
    if (files.length > 5) {
      toast.error("Máximo de 5 arquivos por vez");
      return;
    }

    setSelectedFiles(files);

    // Create previews for images
    const newPreviews: string[] = [];
    files.forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string);
          if (newPreviews.length === files.filter(f => f.type.startsWith("image/")).length) {
            setPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    // Auto-populate title if empty
    if (!formData.title && files.length === 1) {
      const fileName = files[0].name.replace(/\.[^/.]+$/, "");
      setFormData(prev => ({ ...prev, title: fileName }));
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Título é obrigatório";
    }
    if (!formData.type) {
      newErrors.type = "Tipo de imagem é obrigatório";
    }
    if (selectedFiles.length === 0) {
      newErrors.files = "Selecione pelo menos um arquivo";
    }
    if (!formData.date) {
      newErrors.date = "Data é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    setIsLoading(true);

    try {
      // Upload files one by one
      const uploadPromises = selectedFiles.map(async (file) => {
        const formDataToUpload = new FormData();
        
        // Add the file
        formDataToUpload.append("file", file);
        
        // Add metadata
        formDataToUpload.append("title", formData.title || file.name);
        formDataToUpload.append("type", formData.type);
        formDataToUpload.append("category", formData.category);
        formDataToUpload.append("description", formData.notes);
        
        if (formData.tooth) {
          formDataToUpload.append("tooth_number", formData.tooth);
        }

        // Upload the file
        return uploads.uploadPatientImage(patientId, formDataToUpload);
      });

      // Execute all uploads
      await Promise.all(uploadPromises);

      toast.success(
        selectedFiles.length === 1 
          ? "Imagem enviada com sucesso!" 
          : `${selectedFiles.length} imagens enviadas com sucesso!`
      );
      
      onImageUploaded?.();
      onClose();
      
      // Reset form
      setFormData({
        title: "",
        type: "",
        tooth: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
        category: "",
      });
      setSelectedFiles([]);
      setPreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Erro ao enviar imagens");
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    } else if (file.type === "application/pdf") {
      return <FileText className="h-4 w-4" />;
    }
    return <FileImage className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Adicionar Imagem - {patientName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div className="space-y-4">
            <div>
              <Label>Arquivos *</Label>
              <div className="mt-2">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600 hover:text-blue-500">
                        Clique para selecionar arquivos
                      </span>
                      {" ou arraste e solte"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, GIF ou PDF até 10MB (máximo 5 arquivos)
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {errors.files && <p className="text-sm text-red-600 mt-1">{errors.files}</p>}
              </div>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <Label>Arquivos Selecionados ({selectedFiles.length})</Label>
                <div className="grid grid-cols-1 gap-3">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {file.type.startsWith("image/") && previews[index] ? (
                          <img
                            src={previews[index]}
                            alt="Preview"
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                            {getFileIcon(file)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)} • {file.type.split("/")[1].toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Informações da Imagem</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  error={errors.title}
                  placeholder="Ex: Radiografia panorâmica inicial"
                />
              </div>
              <div>
                <Label htmlFor="type">Tipo de Imagem *</Label>
                <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {imageTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-sm text-red-600 mt-1">{errors.type}</p>}
              </div>
              <div>
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  error={errors.date}
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dental Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Localização Dental</h3>
            <div>
              <Label htmlFor="tooth">Dente/Região</Label>
              <Select value={formData.tooth} onValueChange={(value) => handleChange("tooth", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {teeth.map((tooth) => (
                    <SelectItem key={tooth} value={tooth}>
                      {tooth}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Observações
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Adicione observações sobre a imagem, contexto clínico, achados relevantes..."
              rows={3}
            />
          </div>

          {/* Summary */}
          {selectedFiles.length > 0 && formData.title && formData.type && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Resumo do Upload</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Paciente:</strong> {patientName}</p>
                <p><strong>Título:</strong> {formData.title}</p>
                <p><strong>Tipo:</strong> {imageTypes.find(t => t.value === formData.type)?.label}</p>
                <p><strong>Data:</strong> {new Date(formData.date).toLocaleDateString("pt-BR")}</p>
                {formData.tooth && <p><strong>Dente:</strong> {formData.tooth}</p>}
                <p><strong>Arquivos:</strong> {selectedFiles.length} arquivo{selectedFiles.length > 1 ? "s" : ""}</p>
                <p><strong>Tamanho total:</strong> {formatFileSize(selectedFiles.reduce((total, file) => total + file.size, 0))}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || selectedFiles.length === 0}>
              {isLoading ? "Enviando..." : `Enviar ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}