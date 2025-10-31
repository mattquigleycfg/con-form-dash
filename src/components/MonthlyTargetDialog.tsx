import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

interface MonthlyTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: MonthlyTargetData) => void;
}

export interface MonthlyTargetData {
  financial_year: string;
  month: string;
  month_date: string;
  cfg_sales_target: number;
  cfg_invoice_target: number;
  dsf_sales_target: number;
  dsf_invoice_target: number;
  cfg_sales_actual: number;
  cfg_invoice_actual: number;
  dsf_sales_actual: number;
  dsf_invoice_actual: number;
  notes: string | null;
}

const MONTHS = [
  { value: "Jul", label: "July", month: 7 },
  { value: "Aug", label: "August", month: 8 },
  { value: "Sep", label: "September", month: 9 },
  { value: "Oct", label: "October", month: 10 },
  { value: "Nov", label: "November", month: 11 },
  { value: "Dec", label: "December", month: 12 },
  { value: "Jan", label: "January", month: 1 },
  { value: "Feb", label: "February", month: 2 },
  { value: "Mar", label: "March", month: 3 },
  { value: "Apr", label: "April", month: 4 },
  { value: "May", label: "May", month: 5 },
  { value: "Jun", label: "June", month: 6 },
];

const FINANCIAL_YEARS = [
  "FY24-25",
  "FY25-26",
  "FY26-27",
  "FY27-28",
];

export function MonthlyTargetDialog({ open, onOpenChange, onSave }: MonthlyTargetDialogProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const defaultFY = currentMonth >= 7 ? `FY${String(currentYear).slice(2)}-${String(currentYear + 1).slice(2)}` : `FY${String(currentYear - 1).slice(2)}-${String(currentYear).slice(2)}`;

  const [formData, setFormData] = useState<MonthlyTargetData>({
    financial_year: defaultFY,
    month: "",
    month_date: "",
    cfg_sales_target: 0,
    cfg_invoice_target: 0,
    dsf_sales_target: 0,
    dsf_invoice_target: 0,
    cfg_sales_actual: 0,
    cfg_invoice_actual: 0,
    dsf_sales_actual: 0,
    dsf_invoice_actual: 0,
    notes: null,
  });

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      const monthData = MONTHS.find(m => m.value === selectedMonth);
      if (monthData) {
        const year = parseInt(selectedYear);
        const month = monthData.month;
        const date = new Date(year, month - 1, 1);
        const monthDateStr = date.toISOString().split('T')[0];
        const monthLabel = `${monthData.value}-${selectedYear.slice(2)}`;
        
        setFormData(prev => ({
          ...prev,
          month: monthLabel,
          month_date: monthDateStr,
        }));
      }
    }
  }, [selectedMonth, selectedYear]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.month || !formData.month_date) {
      return;
    }
    onSave(formData);
    onOpenChange(false);
    // Reset form
    setFormData({
      financial_year: defaultFY,
      month: "",
      month_date: "",
      cfg_sales_target: 0,
      cfg_invoice_target: 0,
      dsf_sales_target: 0,
      dsf_invoice_target: 0,
      cfg_sales_actual: 0,
      cfg_invoice_actual: 0,
      dsf_sales_actual: 0,
      dsf_invoice_actual: 0,
      notes: null,
    });
    setSelectedMonth("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Monthly Target
          </DialogTitle>
          <DialogDescription>
            Set targets for CFG and DSF divisions for a specific month
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Financial Year and Month Selection */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="financial_year">Financial Year</Label>
              <Select 
                value={formData.financial_year} 
                onValueChange={(value) => setFormData({...formData, financial_year: value})}
              >
                <SelectTrigger id="financial_year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_YEARS.map(fy => (
                    <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
                  <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
                  <SelectItem value={(currentYear + 1).toString()}>{currentYear + 1}</SelectItem>
                  <SelectItem value={(currentYear + 2).toString()}>{currentYear + 2}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CFG Division Targets */}
          <div className="space-y-4 rounded-lg border p-4 bg-primary/5">
            <h3 className="font-semibold text-lg">Con-form Division (CFG)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cfg_sales_target">Sales Target ($)</Label>
                <Input
                  id="cfg_sales_target"
                  type="number"
                  value={formData.cfg_sales_target}
                  onChange={(e) => setFormData({...formData, cfg_sales_target: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg_invoice_target">Invoice Target ($)</Label>
                <Input
                  id="cfg_invoice_target"
                  type="number"
                  value={formData.cfg_invoice_target}
                  onChange={(e) => setFormData({...formData, cfg_invoice_target: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* DSF Division Targets */}
          <div className="space-y-4 rounded-lg border p-4 bg-accent/5">
            <h3 className="font-semibold text-lg">DiamondSteel Division (DSF)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dsf_sales_target">Sales Target ($)</Label>
                <Input
                  id="dsf_sales_target"
                  type="number"
                  value={formData.dsf_sales_target}
                  onChange={(e) => setFormData({...formData, dsf_sales_target: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dsf_invoice_target">Invoice Target ($)</Label>
                <Input
                  id="dsf_invoice_target"
                  type="number"
                  value={formData.dsf_invoice_target}
                  onChange={(e) => setFormData({...formData, dsf_invoice_target: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Actuals (Optional) */}
          <div className="space-y-4 rounded-lg border p-4 bg-secondary/5">
            <h3 className="font-semibold text-lg">Actuals (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cfg_sales_actual">CFG Sales Actual ($)</Label>
                <Input
                  id="cfg_sales_actual"
                  type="number"
                  value={formData.cfg_sales_actual}
                  onChange={(e) => setFormData({...formData, cfg_sales_actual: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dsf_sales_actual">DSF Sales Actual ($)</Label>
                <Input
                  id="dsf_sales_actual"
                  type="number"
                  value={formData.dsf_sales_actual}
                  onChange={(e) => setFormData({...formData, dsf_sales_actual: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({...formData, notes: e.target.value || null})}
              placeholder="Add any notes..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedMonth}>
              Create Target
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

