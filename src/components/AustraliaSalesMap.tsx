import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOdooSalesByRegion } from "@/hooks/useOdooSalesByRegion";
import { useState } from "react";
import australiaMap from "@/assets/australia-map.svg";

// Approximate center coordinates for each state on the SVG (viewBox 0 0 1000 966)
const STATE_COORDINATES: Record<string, { x: number; y: number }> = {
  WA: { x: 250, y: 420 },
  NT: { x: 450, y: 350 },
  QLD: { x: 700, y: 350 },
  SA: { x: 450, y: 600 },
  NSW: { x: 750, y: 700 },
  VIC: { x: 700, y: 850 },
  TAS: { x: 720, y: 950 },
  ACT: { x: 790, y: 750 },
};

export function AustraliaSalesMap() {
  const { regionData, isLoading } = useOdooSalesByRegion();
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Calculate circle size based on sales (larger sales = larger circle)
  const maxSales = Math.max(...regionData.map(r => r.sales), 1);
  const getCircleRadius = (sales: number) => {
    const minRadius = 8;
    const maxRadius = 50;
    const normalized = sales / maxSales;
    return minRadius + (normalized * (maxRadius - minRadius));
  };

  // Get teal color with varying opacity based on sales
  const getCircleColor = (sales: number) => {
    const normalized = sales / maxSales;
    // Using teal with varying opacity
    if (normalized > 0.75) return 'hsl(180, 70%, 40%)'; // Dark teal
    if (normalized > 0.5) return 'hsl(180, 65%, 50%)'; // Medium teal
    if (normalized > 0.25) return 'hsl(180, 60%, 60%)'; // Light teal
    return 'hsl(180, 55%, 70%)'; // Pale teal
  };

  const getRegionData = (regionCode: string) => {
    return regionData.find(r => r.region === regionCode);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales by Region</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by Region</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="relative">
            {/* Base Australia SVG Map */}
            <img 
              src={australiaMap} 
              alt="Australia Map" 
              className="w-full h-auto"
              style={{ maxHeight: '500px' }}
            />
            
            {/* SVG Overlay for scatter points */}
            <svg
              viewBox="0 0 1000 966"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ maxHeight: '500px' }}
            >
              {/* Render circles for each region with data */}
              {regionData.map((region) => {
                const coords = STATE_COORDINATES[region.region];
                if (!coords) return null;
                
                return (
                  <circle
                    key={region.region}
                    cx={coords.x}
                    cy={coords.y}
                    r={getCircleRadius(region.sales)}
                    fill={getCircleColor(region.sales)}
                    opacity={0.7}
                    stroke="hsl(180, 80%, 30%)"
                    strokeWidth="2"
                    className="pointer-events-auto cursor-pointer transition-all hover:opacity-90"
                    onMouseEnter={() => setHoveredRegion(region.region)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  />
                );
              })}
              
              {/* State labels */}
              {Object.entries(STATE_COORDINATES).map(([state, coords]) => (
                <text
                  key={state}
                  x={coords.x}
                  y={coords.y + 4}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="14"
                  fontWeight="bold"
                  className="pointer-events-none"
                  style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
                >
                  {state}
                </text>
              ))}
            </svg>
          </div>

          {/* Tooltip */}
          {hoveredRegion && getRegionData(hoveredRegion) && (
            <div className="absolute top-4 right-4 bg-background border border-border rounded-lg p-4 shadow-lg z-10">
              <h4 className="font-semibold text-lg mb-2">{hoveredRegion}</h4>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Sales: <span className="font-medium text-foreground">
                    {formatCurrency(getRegionData(hoveredRegion)!.sales)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Orders: <span className="font-medium text-foreground">
                    {getRegionData(hoveredRegion)!.orders}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(180, 55%, 70%)' }} />
              <span>Low Sales</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(180, 60%, 60%)' }} />
              <span>Medium-Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(180, 65%, 50%)' }} />
              <span>Medium-High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(180, 70%, 40%)' }} />
              <span>High Sales</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-muted-foreground text-xs">Circle size = Sales amount</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
