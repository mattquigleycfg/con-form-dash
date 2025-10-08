import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface Target {
  id: string;
  name: string;
  targetValue: number;
  period: string;
  metric: string;
}

export default function Settings() {
  const { toast } = useToast();
  const [targets, setTargets] = useState<Target[]>([
    { id: "1", name: "Quarterly Revenue", targetValue: 500000, period: "Q1 2025", metric: "revenue" },
    { id: "2", name: "Deals Closed", targetValue: 200, period: "This Quarter", metric: "deals" },
  ]);
  const [newTarget, setNewTarget] = useState({
    name: "",
    targetValue: 0,
    period: "This Quarter",
    metric: "revenue"
  });

  const handleAddTarget = () => {
    if (!newTarget.name || newTarget.targetValue <= 0) {
      toast({
        title: "Invalid target",
        description: "Please provide a name and target value",
        variant: "destructive"
      });
      return;
    }

    const target: Target = {
      id: Date.now().toString(),
      ...newTarget
    };

    setTargets([...targets, target]);
    setNewTarget({ name: "", targetValue: 0, period: "This Quarter", metric: "revenue" });
    
    toast({
      title: "Target added",
      description: "Your new target has been created successfully"
    });
  };

  const handleDeleteTarget = (id: string) => {
    setTargets(targets.filter(t => t.id !== id));
    toast({
      title: "Target deleted",
      description: "The target has been removed"
    });
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage targets and sync settings with Odoo
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Targets</CardTitle>
            <CardDescription>
              Set targets that will be compared against your Odoo data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing Targets */}
            <div className="space-y-3">
              {targets.map((target) => (
                <div
                  key={target.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                >
                  <div>
                    <p className="font-medium">{target.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Target: {target.targetValue.toLocaleString()} • {target.period} • {target.metric}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTarget(target.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add New Target */}
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Target
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="target-name">Target Name</Label>
                  <Input
                    id="target-name"
                    placeholder="e.g., Monthly Revenue"
                    value={newTarget.name}
                    onChange={(e) => setNewTarget({ ...newTarget, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-value">Target Value</Label>
                  <Input
                    id="target-value"
                    type="number"
                    placeholder="100000"
                    value={newTarget.targetValue || ""}
                    onChange={(e) => setNewTarget({ ...newTarget, targetValue: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-period">Period</Label>
                  <Select
                    value={newTarget.period}
                    onValueChange={(value) => setNewTarget({ ...newTarget, period: value })}
                  >
                    <SelectTrigger id="target-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="This Month">This Month</SelectItem>
                      <SelectItem value="This Quarter">This Quarter</SelectItem>
                      <SelectItem value="This Year">This Year</SelectItem>
                      <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                      <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                      <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                      <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-metric">Metric Type</Label>
                  <Select
                    value={newTarget.metric}
                    onValueChange={(value) => setNewTarget({ ...newTarget, metric: value })}
                  >
                    <SelectTrigger id="target-metric">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="deals">Deals Closed</SelectItem>
                      <SelectItem value="customers">Active Customers</SelectItem>
                      <SelectItem value="conversion">Conversion Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleAddTarget} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Target
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Odoo Integration</CardTitle>
            <CardDescription>
              Connection status and sync preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div>
                <p className="font-medium">Connection Status</p>
                <p className="text-sm text-muted-foreground">Connected to Odoo instance</p>
              </div>
              <div className="flex h-3 w-3 rounded-full bg-accent animate-pulse" />
            </div>
            
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="font-medium mb-2">Auto-sync Settings</p>
              <p className="text-sm text-muted-foreground">
                Data automatically syncs when you visit the dashboard. Use the "Sync Odoo Data" button for manual refresh.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
