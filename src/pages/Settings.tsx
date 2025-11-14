import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Download, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/utils/logger";

interface Target {
  id: string;
  name: string;
  target_value: number;
  period: string;
  metric: string;
}

interface ImportProgress {
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  errorMessages: string[];
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

  const [importProgress, setImportProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    status: 'idle',
    errorMessages: []
  });

  const [updateExisting, setUpdateExisting] = useState(false);

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

  // Helper function to calculate actual costs from analytic lines
  const calculateJobActuals = async (
    analyticAccountIds: number[]
  ): Promise<{ material: number; nonMaterial: number }> => {
    if (analyticAccountIds.length === 0) return { material: 0, nonMaterial: 0 };
    
    try {
      // Fetch analytic lines from Odoo
      const accountFilter = analyticAccountIds.length === 1
        ? [['account_id', '=', analyticAccountIds[0]]]
        : [['account_id', 'in', analyticAccountIds]];
      
      const { data: analyticLines, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'account.analytic.line',
          method: 'search_read',
          args: [accountFilter, ['id', 'name', 'amount', 'product_id']]
        }
      });

      if (error || !analyticLines) {
        logger.error('Failed to fetch analytic lines', error);
        return { material: 0, nonMaterial: 0 };
      }
      
      // Filter to costs only (negative amounts = expenses/costs)
      const costLines = analyticLines.filter((line: any) => line.amount < 0);
      
      // Categorize as material or non-material using keyword matching
      const material = costLines.filter((line: any) => {
        const text = `${line.name || ''} ${line.product_id?.[1] || ''}`.toUpperCase();
        
        // Non-Material keywords take priority
        const nonMaterialKeywords = ['LABOUR', 'LABOR', 'FREIGHT', 'CRANAGE', 'CRANE', 
          'EQUIPMENT', 'PLANT HIRE', 'INSTALLATION', 'SILICON', 'SEALANT', 'CFG TRUCK',
          '[CFGEPH]', '[WC]', 'SERVICE', 'HIRE', 'TRAVEL', 'ACCOMMODATION'];
        
        for (const keyword of nonMaterialKeywords) {
          if (text.includes(keyword)) return false;
        }
        
        // Material keywords
        const materialKeywords = ['RAW', 'HEX BOLT', 'WASHER', 'NUT GAL', 'SCREW', 
          'BRACKET', 'FIXING', 'STANDARD LADDER', 'STANDARD NUT', 'WALKWAY', 'M10', 
          'M12', 'M16', 'BOLT', 'HARDWARE', 'MATERIAL', 'STUB COLUMN', 'POWDER COATING',
          'GALVANIS', 'POST', 'RHS', 'SHS', 'CHS', 'STEEL', 'ALUMINIUM', 'ALUMINUM', 
          'PLATE', 'ANGLE', 'CHANNEL', 'BEAM'];
        
        for (const keyword of materialKeywords) {
          if (text.includes(keyword)) return true;
        }
        
        // PO lines without LABOUR are usually material
        if (text.startsWith('PO') && !text.includes('LABOUR')) {
          return true;
        }
        
        // Default to non-material
        return false;
      });
      
      const materialTotal = Math.abs(material.reduce((sum: number, l: any) => sum + l.amount, 0));
      const nonMaterialTotal = Math.abs(costLines.reduce((sum: number, l: any) => sum + l.amount, 0)) - materialTotal;
      
      logger.info(`Calculated actuals - Material: $${materialTotal.toFixed(2)}, Non-Material: $${nonMaterialTotal.toFixed(2)}`);
      
      return { material: materialTotal, nonMaterial: nonMaterialTotal };
    } catch (error) {
      logger.error('Error calculating job actuals', error);
      return { material: 0, nonMaterial: 0 };
    }
  };

  const handleBulkImportJobs = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to import jobs",
        variant: "destructive"
      });
      return;
    }

    setImportProgress({
      total: 0,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      status: 'running',
      errorMessages: []
    });

    // Create a single persistent toast that we'll update throughout the process
    const progressToast = toast({
      title: "Import Started",
      description: "Fetching sales orders from Odoo...",
    });

    try {
      // Step 1: Fetch confirmed sales orders with analytic accounts from the last year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const dateFilter = oneYearAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      logger.info(`Fetching sales orders from ${dateFilter} onwards`);
      
      const { data: salesOrders, error: fetchError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            [
              ['state', 'in', ['sale', 'done']],
              ['analytic_account_id', '!=', false],
              ['date_order', '>=', dateFilter]
            ],
            ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state', 'user_id', 'team_id', 'analytic_account_id', 'opportunity_id']
          ]
        }
      });

      if (fetchError) throw fetchError;

      const total = salesOrders?.length || 0;
      logger.info(`Found ${total} sales orders with analytic accounts`);

      setImportProgress(prev => ({ ...prev, total }));

      if (total === 0) {
        setImportProgress(prev => ({ ...prev, status: 'completed' }));
        progressToast.update({
          title: "No Orders Found",
          description: "No confirmed sales orders with analytic accounts were found.",
        });
        return;
      }
      
      progressToast.update({
        title: "Processing Jobs",
        description: `Found ${total} sales orders. Starting import...`,
      });

      // Step 2: Check which jobs already exist
      const { data: existingJobs } = await supabase
        .from('jobs')
        .select('odoo_sale_order_id')
        .eq('user_id', user.id);

      const existingOrderIds = new Set(existingJobs?.map(j => j.odoo_sale_order_id) || []);

      // Step 3: Process each order (in background)
      let created = 0, skipped = 0, updated = 0, errors = 0;
      const errorMessages: string[] = [];

      for (const [index, order] of (salesOrders || []).entries()) {
        try {
          // Update progress toast every 10 jobs or on first/last job
          if (index === 0 || (index + 1) % 10 === 0 || (index + 1) === total) {
            progressToast.update({
              title: "Importing Jobs",
              description: `Processing ${index + 1} of ${total} jobs... (${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors)`,
            });
          }

          // Check if already exists
          const alreadyExists = existingOrderIds.has(order.id);
          
          // Skip if already exists and not updating
          if (alreadyExists && !updateExisting) {
            skipped++;
            setImportProgress(prev => ({
              ...prev,
              processed: index + 1,
              skipped
            }));
            continue;
          }

          // Fetch sale order lines for this order
          const { data: orderLines } = await supabase.functions.invoke('odoo-query', {
            body: {
              model: 'sale.order.line',
              method: 'search_read',
              args: [
                [['order_id', '=', order.id]],
                ['id', 'product_id', 'product_uom_qty', 'price_unit', 'price_subtotal', 'purchase_price']
              ]
            }
          });

          // Calculate budgets
          const materialLines = (orderLines || []).filter((line: any) => {
            const productName = line.product_id?.[1] || '';
            const serviceKeywords = ['INSTALLATION', 'FREIGHT', 'CRANAGE', 'ACCOMMODATION', 'TRAVEL'];
            return !serviceKeywords.some(keyword => productName.toUpperCase().includes(keyword));
          });

          const nonMaterialLines = (orderLines || []).filter((line: any) => {
            const productName = line.product_id?.[1] || '';
            const serviceKeywords = ['INSTALLATION', 'FREIGHT', 'CRANAGE', 'ACCOMMODATION', 'TRAVEL'];
            return serviceKeywords.some(keyword => productName.toUpperCase().includes(keyword));
          });

          const materialBudget = materialLines.reduce((sum: number, line: any) => sum + (line.price_subtotal || 0), 0);
          const nonMaterialBudget = nonMaterialLines.reduce((sum: number, line: any) => sum + (line.price_subtotal || 0), 0);

          // Get project info if exists
          let projectAnalyticAccountId = null;
          let projectAnalyticAccountName = null;
          let projectStageId = null;
          let projectStageName = null;

          if (order.analytic_account_id) {
            const { data: projects } = await supabase.functions.invoke("odoo-query", {
              body: {
                model: "project.project",
                method: "search_read",
                args: [
                  [["analytic_account_id", "=", order.analytic_account_id[0]]],
                  ["id", "name", "analytic_account_id", "stage_id"],
                ],
              },
            });

            if (projects && projects.length > 0) {
              const project = projects[0];
              projectAnalyticAccountId = project.analytic_account_id?.[0] || null;
              projectAnalyticAccountName = project.analytic_account_id?.[1] || null;
              projectStageId = project.stage_id?.[0] || null;
              projectStageName = project.stage_id?.[1] || null;
            }
          }

          // Create or update job
          let job;
          let jobError;
          
          if (alreadyExists) {
            // Update existing job
            const { data, error } = await supabase
              .from("jobs")
              .update({
                last_synced_at: new Date().toISOString(),
                last_synced_by_user_id: user.id,
                customer_name: order.partner_id[1],
                total_budget: order.amount_total,
                material_budget: materialBudget,
                non_material_budget: nonMaterialBudget,
                analytic_account_id: order.analytic_account_id ? order.analytic_account_id[0] : null,
                analytic_account_name: order.analytic_account_id ? order.analytic_account_id[1] : null,
                project_analytic_account_id: projectAnalyticAccountId,
                project_analytic_account_name: projectAnalyticAccountName,
                sales_person_name: order.user_id ? order.user_id[1] : null,
                opportunity_name: order.opportunity_id ? order.opportunity_id[1] : null,
                date_order: order.date_order,
                project_stage_id: projectStageId,
                project_stage_name: projectStageName,
              })
              .eq('odoo_sale_order_id', order.id)
              .eq('user_id', user.id)
              .select()
              .single();
            
            job = data;
            jobError = error;
            
            if (!jobError) {
              updated++;
              logger.info(`Updated job for ${order.name}`);
            }
          } else {
            // Create new job
            const { data, error } = await supabase
              .from("jobs")
              .insert([{
                user_id: user.id,
                created_by_user_id: user.id,
                last_synced_at: new Date().toISOString(),
                last_synced_by_user_id: user.id,
                odoo_sale_order_id: order.id,
                sale_order_name: order.name,
                customer_name: order.partner_id[1],
                total_budget: order.amount_total,
                material_budget: materialBudget,
                non_material_budget: nonMaterialBudget,
                total_actual: 0,
                material_actual: 0,
                non_material_actual: 0,
                status: 'active',
                analytic_account_id: order.analytic_account_id ? order.analytic_account_id[0] : null,
                analytic_account_name: order.analytic_account_id ? order.analytic_account_id[1] : null,
                project_analytic_account_id: projectAnalyticAccountId,
                project_analytic_account_name: projectAnalyticAccountName,
                sales_person_name: order.user_id ? order.user_id[1] : null,
                opportunity_name: order.opportunity_id ? order.opportunity_id[1] : null,
                date_order: order.date_order,
                project_stage_id: projectStageId,
                project_stage_name: projectStageName,
              }])
              .select()
              .single();

            job = data;
            jobError = error;
            
            if (!jobError) {
              created++;
              logger.info(`Created job for ${order.name}`);
            }
          }

          if (jobError) throw jobError;

          // Calculate actual costs from analytic lines
          const analyticAccountIds = [];
          if (order.analytic_account_id) {
            analyticAccountIds.push(order.analytic_account_id[0]);
          }
          if (projectAnalyticAccountId && projectAnalyticAccountId !== order.analytic_account_id?.[0]) {
            analyticAccountIds.push(projectAnalyticAccountId);
          }

          if (analyticAccountIds.length > 0) {
            logger.info(`Calculating actuals for ${order.name} from ${analyticAccountIds.length} analytic account(s)`);
            const { material, nonMaterial } = await calculateJobActuals(analyticAccountIds);
            
            // Update job with calculated actuals
            await supabase
              .from('jobs')
              .update({
                material_actual: material,
                non_material_actual: nonMaterial,
                total_actual: material + nonMaterial,
              })
              .eq('id', job.id);
            
            logger.info(`Updated actuals for ${order.name}: Material=$${material.toFixed(2)}, Non-Material=$${nonMaterial.toFixed(2)}`);
          }

          setImportProgress(prev => ({
            ...prev,
            processed: index + 1,
            created,
            updated
          }));

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 150));

        } catch (error) {
          errors++;
          const errorMsg = `${order.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errorMessages.push(errorMsg);
          logger.error(`Error importing ${order.name}`, error);
          
          setImportProgress(prev => ({
            ...prev,
            processed: index + 1,
            errors,
            errorMessages
          }));
        }
      }

      // Completed
      setImportProgress(prev => ({
        ...prev,
        status: errors > 0 ? 'error' : 'completed'
      }));

      queryClient.invalidateQueries({ queryKey: ['jobs'] });

      progressToast.update({
        title: "Import Complete",
        description: `Created ${created} jobs${updated > 0 ? `, updated ${updated}` : ''}, skipped ${skipped}${errors > 0 ? `, ${errors} errors` : ''}. Actual costs have been calculated from analytic lines.`,
        variant: errors > 0 ? 'destructive' : 'default'
      });

    } catch (error) {
      logger.error('Bulk import failed', error);
      setImportProgress(prev => ({
        ...prev,
        status: 'error',
        errorMessages: [error instanceof Error ? error.message : 'Unknown error']
      }));
      progressToast.update({
        title: "Import Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
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
            <CardTitle>Bulk Job Import</CardTitle>
            <CardDescription>
              Import all sales orders with analytic accounts from Odoo as jobs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will fetch confirmed sales orders (state: Sale/Done) from the <strong>last 12 months</strong> that have analytic accounts linked and create corresponding jobs in the Job Costing module.
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2 p-4 rounded-lg border bg-muted/50">
              <Checkbox 
                id="update-existing" 
                checked={updateExisting}
                onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
                disabled={importProgress.status === 'running'}
              />
              <div className="flex-1">
                <Label 
                  htmlFor="update-existing" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Update existing jobs
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  If enabled, jobs that already exist will be updated with fresh data from Odoo including analytic account references. If disabled, existing jobs will be skipped.
                </p>
              </div>
            </div>

            {importProgress.status === 'running' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Importing jobs...</span>
                  <span className="text-muted-foreground">
                    {importProgress.processed} / {importProgress.total}
                  </span>
                </div>
                <Progress 
                  value={importProgress.total > 0 ? (importProgress.processed / importProgress.total) * 100 : 0} 
                  className="h-2"
                />
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created:</span>{" "}
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {importProgress.created}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated:</span>{" "}
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {importProgress.updated}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Skipped:</span>{" "}
                    <span className="font-medium">{importProgress.skipped}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors:</span>{" "}
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {importProgress.errors}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {importProgress.status === 'completed' && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Import completed successfully! Created {importProgress.created} jobs
                  {importProgress.updated > 0 && `, updated ${importProgress.updated}`}, 
                  skipped {importProgress.skipped}.
                  {importProgress.errors > 0 && ` ${importProgress.errors} errors occurred.`}
                </AlertDescription>
              </Alert>
            )}

            {importProgress.status === 'error' && importProgress.errorMessages.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Import encountered errors:</p>
                    <ul className="list-disc list-inside text-xs space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                      {importProgress.errorMessages.slice(0, 10).map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                      {importProgress.errorMessages.length > 10 && (
                        <li>...and {importProgress.errorMessages.length - 10} more errors</li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleBulkImportJobs}
              disabled={importProgress.status === 'running'}
              className="w-full"
            >
              {importProgress.status === 'running' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing... ({importProgress.processed}/{importProgress.total})
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import All Jobs from Odoo
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Only imports sales orders from the last 12 months</p>
              <p>• Jobs are linked to analytic accounts for real-time cost tracking</p>
              <p>• <strong>Actual costs are calculated automatically</strong> from account.analytic.line entries during import</p>
              <p>• Update mode refreshes existing jobs with latest analytic account references and recalculates actual costs</p>
              <p>• This process runs in the background and may take several minutes</p>
              <p>• After import completes, navigate to Job Costing page to see updated actual costs</p>
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
