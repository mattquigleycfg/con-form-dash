import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Plus, Trash2, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useJobBOM } from "@/hooks/useJobBOM";
import { useJobNonMaterialCosts } from "@/hooks/useJobNonMaterialCosts";
import { useOdooAnalyticLines } from "@/hooks/useOdooAnalyticLines";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useOdooProducts } from "@/hooks/useOdooProducts";

export default function JobCostingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: job, isLoading: loadingJob } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: budgetLines, isLoading: loadingBudget } = useQuery({
    queryKey: ["job-budget-lines", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_budget_lines")
        .select("*")
        .eq("job_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { bomLines, isLoading: loadingBOM, createBOMLine, updateBOMLine, deleteBOMLine, importBOMFromCSV } = useJobBOM(id);
  const { costs, isLoading: loadingCosts, createCost, updateCost, deleteCost } = useJobNonMaterialCosts(id);
  const { data: analyticLines } = useOdooAnalyticLines(job?.analytic_account_id || undefined);

  const [isAddBOMOpen, setIsAddBOMOpen] = useState(false);
  const [isAddCostOpen, setIsAddCostOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const { data: products } = useOdooProducts(productSearch);

  const [newBOM, setNewBOM] = useState({
    odoo_product_id: null as number | null,
    product_name: "",
    quantity: 0,
    unit_cost: 0,
    notes: "",
  });

  const [newCost, setNewCost] = useState<{
    cost_type: "installation" | "freight" | "cranage" | "travel" | "accommodation" | "other";
    description: string;
    amount: number;
  }>({
    cost_type: "installation",
    description: "",
    amount: 0,
  });

  const handleAddBOM = () => {
    if (!id || !newBOM.product_name || newBOM.quantity <= 0 || newBOM.unit_cost < 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    createBOMLine({
      job_id: id,
      odoo_product_id: newBOM.odoo_product_id || undefined,
      product_name: newBOM.product_name,
      quantity: newBOM.quantity,
      unit_cost: newBOM.unit_cost,
      total_cost: newBOM.quantity * newBOM.unit_cost,
      notes: newBOM.notes || undefined,
    });

    setNewBOM({
      odoo_product_id: null,
      product_name: "",
      quantity: 0,
      unit_cost: 0,
      notes: "",
    });
    setIsAddBOMOpen(false);
    toast.success("BOM line added successfully");
  };

  const handleAddCost = () => {
    if (!id || !newCost.cost_type || newCost.amount <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    createCost({
      job_id: id,
      cost_type: newCost.cost_type,
      description: newCost.description || undefined,
      amount: newCost.amount,
      is_from_odoo: false,
    });

    setNewCost({
      cost_type: "installation",
      description: "",
      amount: 0,
    });
    setIsAddCostOpen(false);
    toast.success("Cost added successfully");
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      // Parse header to find column indices
      const header = lines[0].split(',').map(h => h.trim());
      const productIndex = header.indexOf('Product');
      const quantityIndex = header.indexOf('To Consume');
      const internalRefIndex = header.indexOf('Internal Reference');

      if (productIndex === -1 || quantityIndex === -1) {
        toast.error("CSV must have 'Product' and 'To Consume' columns");
        return;
      }
      
      // Skip header row
      const dataLines = lines.slice(1);
      
      toast.info("Looking up product costs from Odoo...");
      
      const bomData = await Promise.all(dataLines.map(async (line) => {
        const cols = line.split(',').map(s => s.trim());
        const productName = cols[productIndex];
        const quantity = parseFloat(cols[quantityIndex]) || 0;
        const internalRef = internalRefIndex !== -1 ? cols[internalRefIndex] : '';
        
        // Try to look up product in Odoo by internal reference
        let unitCost = 0;
        let odooProductId: number | undefined;
        
        if (internalRef) {
          try {
            const { data } = await supabase.functions.invoke("odoo-query", {
              body: {
                model: "product.product",
                method: "search_read",
                args: [
                  [["default_code", "=", internalRef]],
                  ["id", "standard_price"],
                  0,
                  1,
                ],
              },
            });
            
            if (data && data.length > 0) {
              odooProductId = data[0].id;
              unitCost = data[0].standard_price || 0;
            }
          } catch (error) {
            console.error(`Failed to lookup product ${internalRef}:`, error);
          }
        }

        return {
          product_name: productName,
          quantity,
          unit_cost: unitCost,
          total_cost: quantity * unitCost,
          odoo_product_id: odooProductId,
        };
      }));

      const validLines = bomData.filter(line => line.product_name && line.quantity > 0);

      if (validLines.length > 0) {
        importBOMFromCSV({ jobId: id, lines: validLines });
        toast.success(`Imported ${validLines.length} BOM lines with costs from Odoo`);
      } else {
        toast.error("No valid lines found in CSV");
      }
    };
    reader.readAsText(file);
  };

  const selectProduct = (productId: number, productName: string, cost: number) => {
    setNewBOM({
      ...newBOM,
      odoo_product_id: productId,
      product_name: productName,
      unit_cost: cost,
    });
    setProductSearch("");
  };

  if (loadingJob) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Job not found</p>
          <Button onClick={() => navigate("/job-costing")} className="mt-4">
            Back to Jobs
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const percentage = job.total_budget > 0 ? (job.total_actual / job.total_budget) * 100 : 0;
  const remaining = job.total_budget - job.total_actual;
  const isOverBudget = remaining < 0;

  // Calculate material totals
  const materialBudgetTotal = budgetLines?.filter(line => line.cost_category === 'material').reduce((sum, line) => sum + line.subtotal, 0) || 0;
  const materialActualTotal = bomLines?.reduce((sum, line) => sum + line.total_cost, 0) || 0;
  const materialRemaining = materialBudgetTotal - materialActualTotal;
  const materialOverBudget = materialRemaining < 0;

  // Calculate non-material totals
  const nonMaterialBudgetTotal = budgetLines?.filter(line => line.cost_category !== 'material').reduce((sum, line) => sum + line.subtotal, 0) || 0;
  const nonMaterialActualTotal = costs?.reduce((sum, cost) => sum + cost.amount, 0) || 0;
  const nonMaterialRemaining = nonMaterialBudgetTotal - nonMaterialActualTotal;
  const nonMaterialOverBudget = nonMaterialRemaining < 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/job-costing")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{job.sale_order_name}</h1>
            <p className="text-muted-foreground mt-1">{job.customer_name}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(job.total_budget)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Material: {formatCurrency(job.material_budget)} | Non-Material: {formatCurrency(job.non_material_budget)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Actual Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(job.total_actual)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Material: {formatCurrency(job.material_actual)} | Non-Material: {formatCurrency(job.non_material_actual)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
                {formatCurrency(remaining)}
              </div>
              <Progress 
                value={percentage} 
                className="mt-2"
                style={{
                  ['--progress-background' as any]: isOverBudget 
                    ? 'hsl(var(--destructive))' 
                    : 'hsl(var(--primary))'
                }}
              />
              <div className="text-xs text-muted-foreground mt-1">{percentage.toFixed(1)}% spent</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="material" className="w-full">
          <TabsList>
            <TabsTrigger value="material">Material</TabsTrigger>
            <TabsTrigger value="non-material">Non-Material</TabsTrigger>
          </TabsList>

          <TabsContent value="material" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Material Budget & BOM</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Budget: {formatCurrency(job.material_budget)} | Actual: {formatCurrency(job.material_actual)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import BOM CSV
                  </Button>
                  <Dialog open={isAddBOMOpen} onOpenChange={setIsAddBOMOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Material
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Material Line</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Search Odoo Product (Optional)</Label>
                          <Input
                            placeholder="Search by product name or internal reference..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                          />
                          {products && products.length > 0 && (
                            <div className="border rounded-md max-h-48 overflow-y-auto">
                              {products.map((product) => (
                                <div
                                  key={product.id}
                                  className="p-2 hover:bg-accent cursor-pointer"
                                  onClick={() => selectProduct(product.id, product.name, product.standard_price)}
                                >
                                  <div className="font-medium">{product.name}</div>
                                  {product.default_code && (
                                    <div className="text-xs text-muted-foreground">
                                      Ref: {product.default_code}
                                    </div>
                                  )}
                                  <div className="text-sm text-muted-foreground">
                                    Cost: {formatCurrency(product.standard_price)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Product Name *</Label>
                          <Input
                            value={newBOM.product_name}
                            onChange={(e) => setNewBOM({ ...newBOM, product_name: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Quantity *</Label>
                            <Input
                              type="number"
                              value={newBOM.quantity || ""}
                              onChange={(e) => setNewBOM({ ...newBOM, quantity: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit Cost *</Label>
                            <Input
                              type="number"
                              value={newBOM.unit_cost || ""}
                              onChange={(e) => setNewBOM({ ...newBOM, unit_cost: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={newBOM.notes}
                            onChange={(e) => setNewBOM({ ...newBOM, notes: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleAddBOM} className="w-full">Add Material Line</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Budget Lines */}
                  <div>
                    <h3 className="font-semibold mb-3 text-sm">Material Budget (From Sales Order)</h3>
                    {loadingBudget ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {budgetLines?.filter(line => line.cost_category === 'material').map((line) => (
                            <TableRow key={line.id}>
                              <TableCell className="font-medium">{line.product_name}</TableCell>
                              <TableCell className="text-right">{line.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(line.subtotal)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className={`font-semibold ${materialOverBudget ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                            <TableCell colSpan={3}>Remaining</TableCell>
                            <TableCell className={`text-right ${materialOverBudget ? 'text-destructive' : 'text-primary'}`}>
                              {formatCurrency(materialRemaining)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* BOM Actuals */}
                  <div>
                    <h3 className="font-semibold mb-3 text-sm">BOM</h3>
                    {loadingBOM ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bomLines?.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>
                                <div className="font-medium">{line.product_name}</div>
                                {line.notes && (
                                  <div className="text-xs text-muted-foreground">{line.notes}</div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">{line.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(line.unit_cost)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(line.total_cost)}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Delete this BOM line?")) {
                                      deleteBOMLine(line.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className={`font-semibold ${materialOverBudget ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                            <TableCell colSpan={3}>Remaining</TableCell>
                            <TableCell className={`text-right ${materialOverBudget ? 'text-destructive' : 'text-primary'}`}>
                              {formatCurrency(materialRemaining)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="non-material" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Non-Material Costs</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Budget: {formatCurrency(job.non_material_budget)} | Actual: {formatCurrency(job.non_material_actual)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!analyticLines || !id) return;
                      
                      toast.info("Importing non-material costs from analytic account...");
                      
                      // Filter for expense-type analytic lines (negative amounts are costs)
                      const expenseLines = analyticLines.filter(line => 
                        line.amount < 0 && line.product_id && line.product_id[0]
                      );
                      
                      for (const line of expenseLines) {
                        const productName = line.product_id ? line.product_id[1] : '';
                        const amount = Math.abs(line.amount);
                        
                        // Determine cost type based on product name
                        let costType: "installation" | "freight" | "cranage" | "travel" | "accommodation" | "other" = "other";
                        const nameUpper = productName.toUpperCase();
                        
                        if (nameUpper.includes('INSTALLATION')) costType = 'installation';
                        else if (nameUpper.includes('FREIGHT')) costType = 'freight';
                        else if (nameUpper.includes('CRANAGE')) costType = 'cranage';
                        else if (nameUpper.includes('ACCOMMODATION')) costType = 'accommodation';
                        else if (nameUpper.includes('TRAVEL')) costType = 'travel';
                        
                        createCost({
                          job_id: id,
                          cost_type: costType,
                          description: line.name || productName,
                          amount: amount,
                          is_from_odoo: true,
                        });
                      }
                      
                      toast.success(`Imported ${expenseLines.length} non-material costs`);
                    }}
                    disabled={!analyticLines || analyticLines.length === 0}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Import from Analytic
                  </Button>
                  <Dialog open={isAddCostOpen} onOpenChange={setIsAddCostOpen}>
                    <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Cost
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Non-Material Cost</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Cost Type *</Label>
                        <Select
                          value={newCost.cost_type}
                          onValueChange={(value: typeof newCost.cost_type) => setNewCost({ ...newCost, cost_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="installation">Installation</SelectItem>
                            <SelectItem value="freight">Freight</SelectItem>
                            <SelectItem value="cranage">Cranage</SelectItem>
                            <SelectItem value="accommodation">Accommodation</SelectItem>
                            <SelectItem value="travel">Travel</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={newCost.description}
                          onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount *</Label>
                        <Input
                          type="number"
                          value={newCost.amount || ""}
                          onChange={(e) => setNewCost({ ...newCost, amount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <Button onClick={handleAddCost} className="w-full">Add Cost</Button>
                    </div>
                  </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Budget Lines */}
                  <div>
                    <h3 className="font-semibold mb-3 text-sm">Budget (From Sales Order)</h3>
                    {loadingBudget ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {budgetLines?.filter(line => line.cost_category !== 'material').length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No non-material budget items
                              </TableCell>
                            </TableRow>
                          ) : (
                            budgetLines?.filter(line => line.cost_category !== 'material').map((line) => (
                              <TableRow key={line.id}>
                                <TableCell className="font-medium">{line.product_name}</TableCell>
                                <TableCell className="text-right">{line.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(line.subtotal)}</TableCell>
                              </TableRow>
                            ))
                          )}
                          <TableRow className={`font-semibold ${nonMaterialOverBudget ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                            <TableCell colSpan={3}>Remaining</TableCell>
                            <TableCell className={`text-right ${nonMaterialOverBudget ? 'text-destructive' : 'text-primary'}`}>
                              {formatCurrency(nonMaterialRemaining)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* Actual Costs by Category */}
                  <h3 className="font-semibold text-sm">Actual</h3>
                  {['installation', 'freight', 'cranage', 'accommodation', 'travel', 'other'].map((type) => {
                    const typeCosts = costs?.filter(c => c.cost_type === type) || [];
                    if (typeCosts.length === 0) return null;

                    return (
                      <div key={type}>
                        <h4 className="font-medium mb-2 text-sm capitalize text-muted-foreground">{type}</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {typeCosts.map((cost) => (
                              <TableRow key={cost.id}>
                                <TableCell>
                                  {cost.description || "-"}
                                  {cost.is_from_odoo && (
                                    <Badge variant="outline" className="ml-2 text-xs">Odoo</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(cost.amount)}</TableCell>
                                <TableCell>
                                  {!cost.is_from_odoo && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("Delete this cost?")) {
                                          deleteCost(cost.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}

                  {(!costs || costs.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No non-material costs added yet. Click "Add Cost" to start tracking.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
