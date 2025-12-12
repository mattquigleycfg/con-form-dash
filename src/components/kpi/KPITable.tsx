import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusChip, type KPIStatus } from "./StatusChip";
import { TrendIndicator, type TrendDirection } from "./TrendIndicator";

export interface KPITableColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  format?: (value: any) => string;
}

export interface KPITableRow {
  id: string;
  label: string;
  values: Record<string, number | string>;
  status?: KPIStatus;
  trend?: TrendDirection;
  editable?: boolean;
}

interface KPITableProps {
  title?: string;
  columns: KPITableColumn[];
  rows: KPITableRow[];
  onEdit?: (rowId: string, columnKey: string, value: number) => void;
  className?: string;
  loading?: boolean;
}

export function KPITable({
  title,
  columns,
  rows,
  onEdit,
  className,
  loading = false,
}: KPITableProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnKey: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleEditStart = (rowId: string, columnKey: string, currentValue: number | string) => {
    setEditingCell({ rowId, columnKey });
    setEditValue(String(currentValue));
  };

  const handleEditSave = () => {
    if (editingCell && onEdit) {
      const numValue = parseFloat(editValue);
      if (!isNaN(numValue)) {
        onEdit(editingCell.rowId, editingCell.columnKey, numValue);
      }
    }
    setEditingCell(null);
    setEditValue("");
  };

  const handleEditCancel = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const formatValue = (value: any, column: KPITableColumn) => {
    if (column.format) {
      return column.format(value);
    }
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    return String(value ?? "-");
  };

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      {title && (
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Metric</TableHead>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center"
                )}
              >
                {column.label}
              </TableHead>
            ))}
            {onEdit && <TableHead className="w-[100px]">Status</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            [...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={columns.length + 2}>
                  <div className="h-8 bg-muted animate-pulse rounded" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 2} className="text-center text-muted-foreground py-8">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {row.label}
                    {row.trend && (
                      <TrendIndicator direction={row.trend} showValue={false} size="sm" />
                    )}
                  </div>
                </TableCell>
                {columns.map((column) => {
                  const isEditing =
                    editingCell?.rowId === row.id && editingCell?.columnKey === column.key;
                  const value = row.values[column.key];

                  return (
                    <TableCell
                      key={column.key}
                      className={cn(
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center"
                      )}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-7 w-20 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSave();
                              if (e.key === "Escape") handleEditCancel();
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleEditSave}
                          >
                            <Check className="h-3 w-3 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleEditCancel}
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 justify-end">
                          <span>{formatValue(value, column)}</span>
                          {row.editable && onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleEditStart(row.id, column.key, value)}
                            >
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  );
                })}
                {onEdit && row.status && (
                  <TableCell>
                    <StatusChip status={row.status} size="sm" />
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

