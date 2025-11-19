import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductCategoryFilterProps {
  value: "all" | "material" | "service";
  onChange: (value: "all" | "material" | "service") => void;
}

export function ProductCategoryFilter({ value, onChange }: ProductCategoryFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="All Products" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Products</SelectItem>
        <SelectItem value="material">Materials Only</SelectItem>
        <SelectItem value="service">Services Only</SelectItem>
      </SelectContent>
    </Select>
  );
}

