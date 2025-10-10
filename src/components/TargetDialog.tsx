import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "@/hooks/useTargets";

interface TargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (target: Omit<Target, "id" | "created_at" | "updated_at" | "user_id">) => void;
  target?: Target | null;
}

export function TargetDialog({ open, onOpenChange, onSave, target }: TargetDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    metric: "revenue",
    period: "Q1 2025",
    target_value: 0,
  });

  useEffect(() => {
    if (target) {
      setFormData({
        name: target.name,
        metric: target.metric,
        period: target.period,
        target_value: target.target_value,
      });
    } else {
      setFormData({
        name: "",
        metric: "revenue",
        period: "Q1 2025",
        target_value: 0,
      });
    }
  }, [target, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target ? "Edit Target" : "Create New Target"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Target Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Quarterly Revenue"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="metric">Metric Type</Label>
            <Select value={formData.metric} onValueChange={(value) => setFormData({ ...formData, metric: value })}>
              <SelectTrigger id="metric">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="deals">Deals Closed</SelectItem>
                <SelectItem value="customers">New Customers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Period</Label>
            <Input
              id="period"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              placeholder="e.g., Q1 2025"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_value">Target Value</Label>
            <Input
              id="target_value"
              type="number"
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value) })}
              placeholder="Enter target value"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {target ? "Update" : "Create"} Target
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
