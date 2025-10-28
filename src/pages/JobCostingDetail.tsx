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

  const [newCost, setNewCost] = useState({
    cost_type: "installation" as const,
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

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").slice(1); // Skip header
      
      const bomData = lines
        .filter(line => line.trim())
        .map(line => {
          const [product_name, quantity, unit_cost, notes] = line.split(",").map(s => s.trim());
          return {
            product_name,
            quantity: parseFloat(quantity) || 0,
            unit_cost: parseFloat(unit_cost) || 0,
            total_cost: (parseFloat(quantity) || 0) * (parseFloat(unit_cost) || 0),
            notes: notes || "",
          };
        });

      if (bomData.length > 0) {
        importBOMFromCSV({ jobId: id, lines: bomData });
        toast.success(`Imported ${bomData.length} BOM lines`);
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
              <div className="text-2xl font-bold">{formatCurrency(remaining)}</div>
              <Progress value={percentage} className="mt-2" />
              <div className="text-xs text-muted-foreground mt-1">{percentage.toFixed(1)}% spent</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="budget" className="w-full">
          <TabsList>
            <TabsTrigger value="budget">Budget (SO Lines)</TabsTrigger>
            <TabsTrigger value="bom">BOM (Actual Materials)</TabsTrigger>
            <TabsTrigger value="costs">Non-Material Costs</TabsTrigger>
          </TabsList>

          <TabsContent value="budget" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Lines from Sales Order</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingBudget ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgetLines?.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">{line.product_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{line.product_type}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{line.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.subtotal)}</TableCell>
                          <TableCell>
                            <Badge variant={line.cost_category === 'material' ? 'default' : 'secondary'}>
                              {line.cost_category === 'material' ? 'Material' : 'Non-Material'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bom" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Bill of Materials (Actual Costs)</CardTitle>
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
                    Import CSV
                  </Button>
                  <Dialog open={isAddBOMOpen} onOpenChange={setIsAddBOMOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Line
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add BOM Line</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Search Odoo Product (Optional)</Label>
                          <Input
                            placeholder="Type to search..."
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
                        <Button onClick={handleAddBOM} className="w-full">Add BOM Line</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingBOM ? (
                  <Skeleton className="h-32 w-full" />
                ) : !bomLines || bomLines.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No BOM lines yet. Add lines manually or import from CSV.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bomLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">{line.product_name}</TableCell>
                          <TableCell className="text-right">{line.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.unit_cost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.total_cost)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{line.notes}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteBOMLine(line.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold">Total Material Costs:</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(bomLines.reduce((sum, line) => sum + line.total_cost, 0))}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Non-Material Costs Breakdown</CardTitle>
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
                          onValueChange={(value: any) => setNewCost({ ...newCost, cost_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="installation">Installation</SelectItem>
                            <SelectItem value="freight">Freight</SelectItem>
                            <SelectItem value="cranage">Cranage</SelectItem>
                            <SelectItem value="travel">Travel</SelectItem>
                            <SelectItem value="accommodation">Accommodation</SelectItem>
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
              </CardHeader>
              <CardContent>
                {loadingCosts ? (
                  <Skeleton className="h-32 w-full" />
                ) : !costs || costs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No non-material costs recorded yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costs.map((cost) => (
                        <TableRow key={cost.id}>
                          <TableCell>
                            <Badge variant="outline">{cost.cost_type}</Badge>
                          </TableCell>
                          <TableCell>{cost.description}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cost.amount)}</TableCell>
                          <TableCell>
                            {cost.is_from_odoo ? (
                              <Badge variant="secondary">Odoo</Badge>
                            ) : (
                              <Badge>Manual</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!cost.is_from_odoo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteCost(cost.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} className="text-right font-bold">Total Non-Material Costs:</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(costs.reduce((sum, cost) => sum + cost.amount, 0))}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
