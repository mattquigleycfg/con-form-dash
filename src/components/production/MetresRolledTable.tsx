import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil, Loader2 } from "lucide-react";
import { useManualKPIs } from "@/hooks/useManualKPIs";
import { getDateRange } from "@/utils/dateHelpers";
import { toast } from "sonner";

interface MetresRolledTableProps {
  period: "week" | "month" | "ytd";
}

const MACHINES = [
  { id: "span", label: "Span+" },
  { id: "acoustic_cassettes", label: "Acoustic Cassettes" },
  { id: "top_hat", label: "Top Hat" },
  { id: "louvre", label: "Louvre" },
  { id: "acoustic_louvre", label: "Acoustic Louvre" },
  { id: "galaxy", label: "Galaxy" },
];

export function MetresRolledTable({ period }: MetresRolledTableProps) {
  const { start, end } = getDateRange(period);
  const { getLatestEntry, saveEntry, isSaving } = useManualKPIs("production", start, end);
  
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  const handleEdit = (machineId: string) => {
    const currentValue = getLatestEntry(`metres_${machineId}_${period}`)?.value ?? 0;
    setEditValues({ [machineId]: currentValue });
    setEditingRow(machineId);
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditValues({});
  };

  const handleSave = async (machineId: string) => {
    try {
      const value = editValues[machineId] ?? 0;
      
      await saveEntry({
        department: "production",
        metricKey: `metres_${machineId}_${period}`,
        value,
        periodStart: start,
        periodEnd: end,
      });

      setEditingRow(null);
      setEditValues({});
      toast.success("Metres rolled updated successfully");
    } catch (error) {
      console.error("Error saving metres rolled:", error);
      toast.error("Failed to save metres rolled");
    }
  };

  const handleValueChange = (machineId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0) {
      setEditValues({ ...editValues, [machineId]: numValue });
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Machine</TableHead>
            <TableHead className="text-right">Metres Rolled</TableHead>
            <TableHead className="w-[120px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MACHINES.map((machine) => {
            const isEditing = editingRow === machine.id;
            const currentValue = getLatestEntry(`metres_${machine.id}_${period}`)?.value ?? 0;
            const entry = getLatestEntry(`metres_${machine.id}_${period}`);
            const lastUpdated = entry?.updated_at;

            return (
              <TableRow key={machine.id}>
                <TableCell className="font-medium">{machine.label}</TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editValues[machine.id] ?? currentValue}
                      onChange={(e) => handleValueChange(machine.id, e.target.value)}
                      className="w-32 ml-auto"
                      autoFocus
                    />
                  ) : (
                    <div>
                      <span className="text-lg font-semibold">{currentValue.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground ml-1">m</span>
                      {lastUpdated && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Updated: {new Date(lastUpdated).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSave(machine.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(machine.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

