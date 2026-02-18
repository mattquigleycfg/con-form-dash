import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

interface ServiceLevelSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const PRESETS = [
  { value: 0.90, label: "90%", desc: "Lower safety stock, higher stockout risk" },
  { value: 0.95, label: "95%", desc: "Balanced approach (recommended)" },
  { value: 0.99, label: "99%", desc: "High safety stock, minimal stockouts" },
];

export function ServiceLevelSlider({ value, onChange }: ServiceLevelSliderProps) {
  const currentPreset = PRESETS.find((p) => Math.abs(p.value - value) < 0.005);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Service Level Target
          <Badge variant="outline" className="ml-auto text-xs">
            {(value * 100).toFixed(0)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Slider
          value={[value * 100]}
          min={85}
          max={99.5}
          step={0.5}
          onValueChange={([v]) => onChange(v / 100)}
        />
        <div className="flex justify-between">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange(p.value)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                Math.abs(p.value - value) < 0.005
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {currentPreset && (
          <p className="text-[10px] text-muted-foreground text-center">{currentPreset.desc}</p>
        )}
      </CardContent>
    </Card>
  );
}
