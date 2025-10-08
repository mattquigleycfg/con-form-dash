import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  dataSource: string;
}

interface WidgetCreatorDrawerProps {
  onCreateWidget: (widget: WidgetConfig) => void;
}

const CHART_TYPES = [
  { value: "revenue", label: "Revenue Chart" },
  { value: "pipeline", label: "Pipeline Chart" },
  { value: "sankey", label: "Sankey Flow Chart" },
  { value: "performance", label: "Performance Table" },
  { value: "targets", label: "Target Progress" },
];

const DATA_SOURCES = [
  { value: "sales_orders", label: "Sales Orders" },
  { value: "opportunities", label: "Opportunities" },
  { value: "team_performance", label: "Team Performance" },
  { value: "revenue_data", label: "Revenue Data" },
  { value: "targets", label: "Sales Targets" },
];

export function WidgetCreatorDrawer({ onCreateWidget }: WidgetCreatorDrawerProps) {
  const [open, setOpen] = useState(false);
  const [chartType, setChartType] = useState("");
  const [dataSource, setDataSource] = useState("");
  const [title, setTitle] = useState("");
  const { toast } = useToast();

  const handleCreate = () => {
    if (!chartType || !dataSource || !title) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const widget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type: chartType,
      title,
      dataSource,
    };

    onCreateWidget(widget);
    
    toast({
      title: "Widget Created",
      description: `${title} has been added to your dashboard`,
    });

    // Reset form
    setChartType("");
    setDataSource("");
    setTitle("");
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Widget
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Create New Widget</SheetTitle>
          <SheetDescription>
            Add a custom widget to your dashboard with data from Odoo
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="title">Widget Title</Label>
            <Input
              id="title"
              placeholder="Enter widget title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chart-type">Chart Type</Label>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger id="chart-type">
                <SelectValue placeholder="Select chart type" />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data-source">Data Source</Label>
            <Select value={dataSource} onValueChange={setDataSource}>
              <SelectTrigger id="data-source">
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent>
                {DATA_SOURCES.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4">
            <Button onClick={handleCreate} className="w-full">
              Create Widget
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
