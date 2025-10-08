import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RangeSliderFilterProps {
  label: string;
  min: number;
  max: number;
  value: { min: number; max: number };
  onChange: (value: { min: number; max: number }) => void;
  step?: number;
  formatValue?: (value: number) => string;
}

export function RangeSliderFilter({
  label,
  min,
  max,
  value,
  onChange,
  step = 1,
  formatValue = (v) => v.toString(),
}: RangeSliderFilterProps) {
  const [localValue, setLocalValue] = useState(value);

  const handleSliderChange = (values: number[]) => {
    const newValue = { min: values[0], max: values[1] };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Number(e.target.value);
    const newValue = { min: newMin, max: localValue.max };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Number(e.target.value);
    const newValue = { min: localValue.min, max: newMax };
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <Label>{label}</Label>
      <div className="px-2">
        <Slider
          min={min}
          max={max}
          step={step}
          value={[localValue.min, localValue.max]}
          onValueChange={handleSliderChange}
          className="w-full"
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Min</Label>
          <Input
            type="number"
            value={localValue.min}
            onChange={handleMinChange}
            min={min}
            max={localValue.max}
            step={step}
            className="mt-1"
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Max</Label>
          <Input
            type="number"
            value={localValue.max}
            onChange={handleMaxChange}
            min={localValue.min}
            max={max}
            step={step}
            className="mt-1"
          />
        </div>
      </div>
      <div className="text-sm text-muted-foreground text-center">
        {formatValue(localValue.min)} - {formatValue(localValue.max)}
      </div>
    </div>
  );
}
