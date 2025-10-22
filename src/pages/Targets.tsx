import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOdooSync } from "@/hooks/useOdooSync";
import { useEffect, useState, useMemo } from "react";
import { Target, TrendingUp, Users, Award, Plus, Pencil, Trash2, Download, Calendar } from "lucide-react";
import { useTargets } from "@/hooks/useTargets";
import { TargetDialog } from "@/components/TargetDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMonthlyTargets } from "@/hooks/useMonthlyTargets";
import { MonthlyTargetsTable } from "@/components/MonthlyTargetsTable";
import { MonthlyTargetsGantt } from "@/components/MonthlyTargetsGantt";
import { BarChart3, Table2 } from "lucide-react";

export default function Targets() {
  const { syncOdooData, metrics } = useOdooSync();
  const { targets, isLoading, createTarget, updateTarget, deleteTarget } = useTargets();
  const { targets: monthlyTargets, isLoading: isMonthlyLoading, updateTarget: updateMonthlyTarget, seedFY2526Data } = useMonthlyTargets("FY25-26");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [monthlyView, setMonthlyView] = useState<"table" | "gantt">("table");
  const [editingTarget, setEditingTarget] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetToDelete, setTargetToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [metricFilter, setMetricFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  useEffect(() => {
    syncOdooData();
  }, []);

  const getIconByMetric = (metric: string) => {
    switch (metric) {
      case "revenue":
        return TrendingUp;
      case "deals":
        return Award;
      case "customers":
        return Users;
      default:
        return Target;
    }
  };

  const getCurrentValue = (metric: string) => {
    switch (metric) {
      case "revenue":
        return metrics?.totalRevenue || 0;
      case "deals":
        return metrics?.dealsClosed || 0;
      case "customers":
        return metrics?.activeCustomers || 0;
      default:
        return 0;
    }
  };

  const filteredTargets = useMemo(() => {
    return targets.filter(target => {
      const matchesSearch = target.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMetric = metricFilter === "all" || target.metric === metricFilter;
      const matchesPeriod = periodFilter === "all" || target.period === periodFilter;
      return matchesSearch && matchesMetric && matchesPeriod;
    });
  }, [targets, searchQuery, metricFilter, periodFilter]);

  const uniquePeriods = Array.from(new Set(targets.map(t => t.period)));

  const handleEdit = (target: any) => {
    setEditingTarget(target);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setTargetToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (targetToDelete) {
      deleteTarget(targetToDelete);
      setDeleteDialogOpen(false);
      setTargetToDelete(null);
    }
  };

  const handleSave = (targetData: any) => {
    if (editingTarget) {
      updateTarget({ id: editingTarget.id, ...targetData });
    } else {
      createTarget(targetData);
    }
    setEditingTarget(null);
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Targets</h1>
          <p className="mt-1 text-muted-foreground">
            Track progress towards your goals and manage monthly targets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={seedFY2526Data}>
            <Download className="mr-2 h-4 w-4" />
            Seed FY25-26
          </Button>
          <Button onClick={() => { setEditingTarget(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Target
          </Button>
        </div>
      </div>

      <Tabs defaultValue="monthly" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Monthly Targets
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Goals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Tabs value={monthlyView} onValueChange={(v) => setMonthlyView(v as "table" | "gantt")}>
              <TabsList>
                <TabsTrigger value="table" className="flex items-center gap-2">
                  <Table2 className="h-4 w-4" />
                  Table View
                </TabsTrigger>
                <TabsTrigger value="gantt" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Gantt View
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {monthlyView === "table" ? (
            <MonthlyTargetsTable 
              targets={monthlyTargets} 
              onUpdate={updateMonthlyTarget}
            />
          ) : (
            <MonthlyTargetsGantt targets={monthlyTargets} />
          )}
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="search">Search Targets</Label>
          <Input
            id="search"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="metric">Filter by Metric</Label>
          <Select value={metricFilter} onValueChange={setMetricFilter}>
            <SelectTrigger id="metric">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Metrics</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="deals">Deals</SelectItem>
              <SelectItem value="customers">Customers</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="period">Filter by Period</Label>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger id="period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              {uniquePeriods.map(period => (
                <SelectItem key={period} value={period}>{period}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-6">
        {filteredTargets.map((target) => {
          const current = getCurrentValue(target.metric);
          const percentage = Math.min((current / target.target_value) * 100, 100);
          const IconComponent = getIconByMetric(target.metric);
          
          return (
            <Card key={target.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{target.name}</CardTitle>
                      <CardDescription>{target.period}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <p className="text-2xl font-bold text-foreground">
                        {percentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {current.toLocaleString()} / {target.target_value.toLocaleString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(target)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(target.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={percentage} className="h-3" />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Current: {current.toLocaleString()}</span>
                  <span>Target: {target.target_value.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredTargets.length === 0 && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No targets found. Create your first target to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
        </TabsContent>
      </Tabs>

      <TargetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        target={editingTarget}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Target</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this target? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
