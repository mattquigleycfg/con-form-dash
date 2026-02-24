import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import {
  useInstallationDayTracking,
  type InstallationDayInsert,
} from "@/hooks/useInstallationDayTracking";

const PRODUCT_TYPES = ["MR", "CR", "Span+", "Screen"];
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS"];

function varianceBadge(quoted: number, actual: number) {
  const diff = quoted - actual;
  if (actual === 0) return <Badge variant="secondary">Pending</Badge>;
  if (diff > 1) return <Badge variant="destructive">+{diff.toFixed(1)} over</Badge>;
  if (diff < -0.5) return <Badge className="bg-amber-500">Under by {Math.abs(diff).toFixed(1)}</Badge>;
  return <Badge className="bg-green-600">On target</Badge>;
}

export function DayTrackingTable() {
  const { records, isLoading, createRecord, deleteRecord, isCreating } =
    useInstallationDayTracking();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InstallationDayInsert>({
    sale_order_ref: "",
    sale_order_id: null,
    customer_name: null,
    product_type: "MR",
    state: null,
    platform_area_m2: null,
    quoted_days: 0,
    actual_days: 0,
    po_days: null,
    vendor: null,
    notes: null,
    tracked_by: null,
  });

  const handleSubmit = () => {
    if (!form.sale_order_ref || !form.product_type) return;
    createRecord(form, {
      onSuccess: () => {
        setOpen(false);
        setForm({
          sale_order_ref: "",
          sale_order_id: null,
          customer_name: null,
          product_type: "MR",
          state: null,
          platform_area_m2: null,
          quoted_days: 0,
          actual_days: 0,
          po_days: null,
          vendor: null,
          notes: null,
          tracked_by: null,
        });
      },
    });
  };

  const totalQuoted = (records || []).reduce((s, r) => s + r.quoted_days, 0);
  const totalActual = (records || []).reduce((s, r) => s + r.actual_days, 0);
  const withActual = (records || []).filter((r) => r.actual_days > 0);
  const avgVariance =
    withActual.length > 0
      ? withActual.reduce((s, r) => s + (r.quoted_days - r.actual_days), 0) / withActual.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tracked Jobs</p>
            <p className="text-2xl font-bold">{(records || []).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Quoted Days</p>
            <p className="text-2xl font-bold">{totalQuoted.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Actual Days</p>
            <p className="text-2xl font-bold">{totalActual.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Overquote (days)</p>
            <p className={`text-2xl font-bold ${avgVariance > 0 ? "text-destructive" : "text-green-600"}`}>
              {avgVariance > 0 ? "+" : ""}{avgVariance.toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add button + Dialog */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Track actual installation days to compare against what was quoted.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Track Installation Days</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>SO Reference</Label>
                  <Input
                    placeholder="SO29022"
                    value={form.sale_order_ref}
                    onChange={(e) => setForm({ ...form, sale_order_ref: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Customer</Label>
                  <Input
                    placeholder="Customer name"
                    value={form.customer_name || ""}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value || null })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Product Type</Label>
                  <Select
                    value={form.product_type}
                    onValueChange={(v) => setForm({ ...form, product_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>State</Label>
                  <Select
                    value={form.state || ""}
                    onValueChange={(v) => setForm({ ...form, state: v || null })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Area (m&sup2;)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.platform_area_m2 ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, platform_area_m2: e.target.value ? parseFloat(e.target.value) : null })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Quoted Days</Label>
                  <Input
                    type="number"
                    value={form.quoted_days}
                    onChange={(e) => setForm({ ...form, quoted_days: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Actual Days</Label>
                  <Input
                    type="number"
                    value={form.actual_days}
                    onChange={(e) => setForm({ ...form, actual_days: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Vendor</Label>
                  <Input
                    placeholder="Installer name"
                    value={form.vendor || ""}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value || null })}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Any context on this job..."
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
                  rows={2}
                />
              </div>
              <Button onClick={handleSubmit} disabled={isCreating || !form.sale_order_ref}>
                {isCreating ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-background">SO Ref</TableHead>
                  <TableHead className="sticky top-0 bg-background">Customer</TableHead>
                  <TableHead className="sticky top-0 bg-background">Type</TableHead>
                  <TableHead className="sticky top-0 bg-background">State</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Quoted</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Actual</TableHead>
                  <TableHead className="sticky top-0 bg-background">Variance</TableHead>
                  <TableHead className="sticky top-0 bg-background">Vendor</TableHead>
                  <TableHead className="sticky top-0 bg-background w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : (records || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No entries yet. Click "Add Entry" to start tracking.
                    </TableCell>
                  </TableRow>
                ) : (
                  (records || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.sale_order_ref}</TableCell>
                      <TableCell className="max-w-[140px] truncate">{r.customer_name || "\u2014"}</TableCell>
                      <TableCell><Badge variant="outline">{r.product_type}</Badge></TableCell>
                      <TableCell>{r.state || "\u2014"}</TableCell>
                      <TableCell className="text-right">{r.quoted_days}</TableCell>
                      <TableCell className="text-right">{r.actual_days}</TableCell>
                      <TableCell>{varianceBadge(r.quoted_days, r.actual_days)}</TableCell>
                      <TableCell className="max-w-[120px] truncate">{r.vendor || "\u2014"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteRecord(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
