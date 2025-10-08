import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface Target {
  id: string;
  name: string;
  target_value: number;
  period: string;
  metric: string;
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [newTarget, setNewTarget] = useState({
    name: "",
    targetValue: 0,
    period: "This Quarter",
    metric: "revenue"
  });

  // Fetch targets from database
  const { data: targets = [], isLoading } = useQuery({
    queryKey: ['sales-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_targets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Target[];
    },
    enabled: !!user
  });

  // Add target mutation
  const addTargetMutation = useMutation({
    mutationFn: async (target: { name: string; target_value: number; period: string; metric: string }) => {
      const { data, error } = await supabase
        .from('sales_targets')
        .insert([{ ...target, user_id: user?.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] });
      setNewTarget({ name: "", targetValue: 0, period: "This Quarter", metric: "revenue" });
      toast({
        title: "Target added",
        description: "Your new target has been created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete target mutation
  const deleteTargetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_targets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] });
      toast({
        title: "Target deleted",
        description: "The target has been removed"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
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

    addTargetMutation.mutate({
      name: newTarget.name,
      target_value: newTarget.targetValue,
      period: newTarget.period,
      metric: newTarget.metric
    });
  };

  const handleDeleteTarget = (id: string) => {
    deleteTargetMutation.mutate(id);
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
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading targets...</p>
              ) : targets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No targets set yet. Add your first target below.</p>
              ) : (
                targets.map((target) => (
                  <div
                    key={target.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                  >
                    <div>
                      <p className="font-medium">{target.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Target: {Number(target.target_value).toLocaleString()} • {target.period} • {target.metric}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTarget(target.id)}
                      disabled={deleteTargetMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
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

              <Button 
                onClick={handleAddTarget} 
                className="w-full"
                disabled={addTargetMutation.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                {addTargetMutation.isPending ? "Adding..." : "Add Target"}
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
