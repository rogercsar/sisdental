import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Heart, 
  AlertTriangle, 
  Pill, 
  Plus, 
  X, 
  Users,
  Activity,
  Shield
} from "lucide-react";
import { usePatientsStore } from "@/lib/store/patients";
import type { Patient } from "@/lib/supabase";

interface EditMedicalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onPatientUpdated: (patient: Patient) => void;
}

export function EditMedicalHistoryModal({
  isOpen,
  onClose,
  patient,
  onPatientUpdated,
}: EditMedicalHistoryModalProps) {
  const { updatePatient, isLoading } = usePatientsStore();
  
  // States for each medical history category
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [diseases, setDiseases] = useState<string[]>([]);
  const [surgeries, setSurgeries] = useState<string[]>([]);
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);
  
  // Input states for adding new items
  const [newAllergy, setNewAllergy] = useState("");
  const [newMedication, setNewMedication] = useState("");
  const [newDisease, setNewDisease] = useState("");
  const [newSurgery, setNewSurgery] = useState("");
  const [newFamilyHistory, setNewFamilyHistory] = useState("");

  useEffect(() => {
    if (patient && isOpen) {
      // Parse existing medical history data
      setAllergies(patient.allergies ? patient.allergies.split(',').map(item => item.trim()) : []);
      setMedications(patient.medications ? patient.medications.split(',').map(item => item.trim()) : []);
      setDiseases(patient.diseases ? patient.diseases.split(',').map(item => item.trim()) : []);
      setSurgeries(patient.surgeries ? patient.surgeries.split(',').map(item => item.trim()) : []);
      setFamilyHistory(patient.family_history ? patient.family_history.split(',').map(item => item.trim()) : []);
    }
  }, [patient, isOpen]);

  const addItem = (type: 'allergies' | 'medications' | 'diseases' | 'surgeries' | 'familyHistory', value: string) => {
    if (!value.trim()) return;
    
    const trimmedValue = value.trim();
    
    switch (type) {
      case 'allergies':
        if (!allergies.includes(trimmedValue)) {
          setAllergies([...allergies, trimmedValue]);
          setNewAllergy("");
        }
        break;
      case 'medications':
        if (!medications.includes(trimmedValue)) {
          setMedications([...medications, trimmedValue]);
          setNewMedication("");
        }
        break;
      case 'diseases':
        if (!diseases.includes(trimmedValue)) {
          setDiseases([...diseases, trimmedValue]);
          setNewDisease("");
        }
        break;
      case 'surgeries':
        if (!surgeries.includes(trimmedValue)) {
          setSurgeries([...surgeries, trimmedValue]);
          setNewSurgery("");
        }
        break;
      case 'familyHistory':
        if (!familyHistory.includes(trimmedValue)) {
          setFamilyHistory([...familyHistory, trimmedValue]);
          setNewFamilyHistory("");
        }
        break;
    }
  };

  const removeItem = (type: 'allergies' | 'medications' | 'diseases' | 'surgeries' | 'familyHistory', index: number) => {
    switch (type) {
      case 'allergies':
        setAllergies(allergies.filter((_, i) => i !== index));
        break;
      case 'medications':
        setMedications(medications.filter((_, i) => i !== index));
        break;
      case 'diseases':
        setDiseases(diseases.filter((_, i) => i !== index));
        break;
      case 'surgeries':
        setSurgeries(surgeries.filter((_, i) => i !== index));
        break;
      case 'familyHistory':
        setFamilyHistory(familyHistory.filter((_, i) => i !== index));
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'allergies' | 'medications' | 'diseases' | 'surgeries' | 'familyHistory', value: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem(type, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const updateData = {
        allergies: allergies.length > 0 ? allergies.join(', ') : undefined,
        medications: medications.length > 0 ? medications.join(', ') : undefined,
        diseases: diseases.length > 0 ? diseases.join(', ') : undefined,
        surgeries: surgeries.length > 0 ? surgeries.join(', ') : undefined,
        family_history: familyHistory.length > 0 ? familyHistory.join(', ') : undefined,
      };

      const updatedPatient = await updatePatient(patient.id, updateData);
      onPatientUpdated(updatedPatient);
      toast.success("Histórico médico atualizado com sucesso!");
      onClose();
    } catch (error) {
      console.error("Error updating medical history:", error);
      toast.error("Erro ao atualizar histórico médico");
    }
  };

  const commonAllergies = [
    "Penicilina", "Sulfa", "Aspirina", "Látex", "Iodo", "Anestésico Local",
    "Amoxicilina", "Dipirona", "Anti-inflamatórios", "Corticoides"
  ];

  const commonMedications = [
    "Losartana", "Atenolol", "Metformina", "Insulina", "AAS", "Sinvastatina",
    "Omeprazol", "Vitamina D", "Vitamina B12", "Ácido Fólico"
  ];

  const commonDiseases = [
    "Hipertensão", "Diabetes", "Cardiopatia", "Asma", "Tireoide", "Epilepsia",
    "Osteoporose", "Artrite", "Depressão", "Ansiedade"
  ];

  const ItemsList = ({ 
    items, 
    onRemove, 
    emptyMessage,
    bgColor = "bg-gray-50",
    borderColor = "border-gray-200",
    textColor = "text-gray-700"
  }: {
    items: string[];
    onRemove: (index: number) => void;
    emptyMessage: string;
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
  }) => (
    <div className="space-y-2">
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <Badge
              key={index}
              variant="outline"
              className={`${bgColor} ${borderColor} ${textColor} flex items-center gap-2 px-3 py-1`}
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="hover:text-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">{emptyMessage}</p>
      )}
    </div>
  );

  const QuickAddButtons = ({ 
    items, 
    onAdd,
    currentList
  }: {
    items: string[];
    onAdd: (item: string) => void;
    currentList: string[];
  }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.filter(item => !currentList.includes(item)).slice(0, 6).map((item) => (
        <Button
          key={item}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAdd(item)}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          {item}
        </Button>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Editar Histórico Médico - {patient.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="allergies" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="allergies" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alergias
              </TabsTrigger>
              <TabsTrigger value="medications" className="flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Medicamentos
              </TabsTrigger>
              <TabsTrigger value="diseases" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Doenças
              </TabsTrigger>
              <TabsTrigger value="surgeries" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Cirurgias
              </TabsTrigger>
              <TabsTrigger value="family" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Família
              </TabsTrigger>
            </TabsList>

            <TabsContent value="allergies" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-600">
                  <Shield className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Alergias</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="newAllergy">Adicionar Alergia</Label>
                    <div className="flex gap-2">
                      <Input
                        id="newAllergy"
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'allergies', newAllergy)}
                        placeholder="Digite uma alergia e pressione Enter"
                      />
                      <Button
                        type="button"
                        onClick={() => addItem('allergies', newAllergy)}
                        size="sm"
                        disabled={!newAllergy.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <QuickAddButtons 
                      items={commonAllergies} 
                      onAdd={(item) => addItem('allergies', item)}
                      currentList={allergies}
                    />
                  </div>
                </div>

                <div>
                  <Label>Alergias Registradas ({allergies.length})</Label>
                  <ItemsList
                    items={allergies}
                    onRemove={(index) => removeItem('allergies', index)}
                    emptyMessage="Nenhuma alergia registrada"
                    bgColor="bg-red-50"
                    borderColor="border-red-200"
                    textColor="text-red-700"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="medications" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <Pill className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Medicamentos</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="newMedication">Adicionar Medicamento</Label>
                    <div className="flex gap-2">
                      <Input
                        id="newMedication"
                        value={newMedication}
                        onChange={(e) => setNewMedication(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'medications', newMedication)}
                        placeholder="Digite um medicamento e pressione Enter"
                      />
                      <Button
                        type="button"
                        onClick={() => addItem('medications', newMedication)}
                        size="sm"
                        disabled={!newMedication.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <QuickAddButtons 
                      items={commonMedications} 
                      onAdd={(item) => addItem('medications', item)}
                      currentList={medications}
                    />
                  </div>
                </div>

                <div>
                  <Label>Medicamentos Registrados ({medications.length})</Label>
                  <ItemsList
                    items={medications}
                    onRemove={(index) => removeItem('medications', index)}
                    emptyMessage="Nenhum medicamento registrado"
                    bgColor="bg-blue-50"
                    borderColor="border-blue-200"
                    textColor="text-blue-700"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="diseases" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-600">
                  <Heart className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Doenças e Condições</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="newDisease">Adicionar Doença/Condição</Label>
                    <div className="flex gap-2">
                      <Input
                        id="newDisease"
                        value={newDisease}
                        onChange={(e) => setNewDisease(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'diseases', newDisease)}
                        placeholder="Digite uma doença e pressione Enter"
                      />
                      <Button
                        type="button"
                        onClick={() => addItem('diseases', newDisease)}
                        size="sm"
                        disabled={!newDisease.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <QuickAddButtons 
                      items={commonDiseases} 
                      onAdd={(item) => addItem('diseases', item)}
                      currentList={diseases}
                    />
                  </div>
                </div>

                <div>
                  <Label>Doenças Registradas ({diseases.length})</Label>
                  <ItemsList
                    items={diseases}
                    onRemove={(index) => removeItem('diseases', index)}
                    emptyMessage="Nenhuma doença registrada"
                    bgColor="bg-orange-50"
                    borderColor="border-orange-200"
                    textColor="text-orange-700"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="surgeries" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-600">
                  <Activity className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Cirurgias e Procedimentos</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="newSurgery">Adicionar Cirurgia</Label>
                    <div className="flex gap-2">
                      <Input
                        id="newSurgery"
                        value={newSurgery}
                        onChange={(e) => setNewSurgery(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'surgeries', newSurgery)}
                        placeholder="Digite uma cirurgia e pressione Enter"
                      />
                      <Button
                        type="button"
                        onClick={() => addItem('surgeries', newSurgery)}
                        size="sm"
                        disabled={!newSurgery.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Cirurgias Registradas ({surgeries.length})</Label>
                  <ItemsList
                    items={surgeries}
                    onRemove={(index) => removeItem('surgeries', index)}
                    emptyMessage="Nenhuma cirurgia registrada"
                    bgColor="bg-purple-50"
                    borderColor="border-purple-200"
                    textColor="text-purple-700"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="family" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <Users className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Histórico Familiar</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="newFamilyHistory">Adicionar Histórico Familiar</Label>
                    <div className="flex gap-2">
                      <Input
                        id="newFamilyHistory"
                        value={newFamilyHistory}
                        onChange={(e) => setNewFamilyHistory(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'familyHistory', newFamilyHistory)}
                        placeholder="Ex: Diabetes (Mãe), Hipertensão (Pai)"
                      />
                      <Button
                        type="button"
                        onClick={() => addItem('familyHistory', newFamilyHistory)}
                        size="sm"
                        disabled={!newFamilyHistory.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Inclua a condição e o parentesco (ex: "Diabetes - Mãe")
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Histórico Familiar Registrado ({familyHistory.length})</Label>
                  <ItemsList
                    items={familyHistory}
                    onRemove={(index) => removeItem('familyHistory', index)}
                    emptyMessage="Nenhum histórico familiar registrado"
                    bgColor="bg-green-50"
                    borderColor="border-green-200"
                    textColor="text-green-700"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}