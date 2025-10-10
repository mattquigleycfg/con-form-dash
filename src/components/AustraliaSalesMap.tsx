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
  NSW: { x: 830, y: 620 },
  VIC: { x: 750, y: 780 },
  TAS: { x: 780, y: 900 },
  ACT: { x: 870, y: 680 },
};

export function AustraliaSalesMap() {
  const { regionData, isLoading } = useOdooSalesByRegion();
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Calculate total orders and percentage share
  const totalOrders = regionData.reduce((sum, r) => sum + r.orders, 0);
  
  const getPercentageShare = (orders: number) => {
    return totalOrders > 0 ? (orders / totalOrders) * 100 : 0;
  };

  // Calculate circle size based on percentage share
  const getCircleRadius = (orders: number) => {
    const percentage = getPercentageShare(orders);
    const minRadius = 15;
    const maxRadius = 60;
    // Scale based on percentage (0-100%)
    return minRadius + (percentage / 100) * (maxRadius - minRadius);
  };

  // Get teal color with varying intensity based on percentage
  const getCircleColor = (orders: number) => {
    const percentage = getPercentageShare(orders);
    // Using teal with varying shades
    if (percentage > 30) return 'hsl(180, 70%, 35%)'; // Dark teal
    if (percentage > 20) return 'hsl(180, 65%, 45%)'; // Medium teal
    if (percentage > 10) return 'hsl(180, 60%, 55%)'; // Light teal
    return 'hsl(180, 55%, 65%)'; // Pale teal
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
                
                const percentage = getPercentageShare(region.orders);
                
                return (
                  <g key={region.region}>
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r={getCircleRadius(region.orders)}
                      fill={getCircleColor(region.orders)}
                      opacity={0.7}
                      stroke="hsl(180, 80%, 30%)"
                      strokeWidth="2"
                      className="pointer-events-auto cursor-pointer transition-all hover:opacity-90"
                      onMouseEnter={() => setHoveredRegion(region.region)}
                      onMouseLeave={() => setHoveredRegion(null)}
                    />
                    {/* State label and percentage inside circle */}
                    <text
                      x={coords.x}
                      y={coords.y - 5}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize="12"
                      fontWeight="bold"
                      className="pointer-events-none"
                      style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
                    >
                      {region.region}
                    </text>
                    <text
                      x={coords.x}
                      y={coords.y + 10}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize="14"
                      fontWeight="bold"
                      className="pointer-events-none"
                      style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
                    >
                      {percentage.toFixed(0)}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Tooltip */}
          {hoveredRegion && getRegionData(hoveredRegion) && (
            <div className="absolute top-4 right-4 bg-background border border-border rounded-lg p-4 shadow-lg z-10">
              <h4 className="font-semibold text-lg mb-2">{hoveredRegion}</h4>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Share of Total: <span className="font-medium text-foreground">
                    {getPercentageShare(getRegionData(hoveredRegion)!.orders).toFixed(1)}%
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Orders: <span className="font-medium text-foreground">
                    {getRegionData(hoveredRegion)!.orders}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Sales: <span className="font-medium text-foreground">
                    {formatCurrency(getRegionData(hoveredRegion)!.sales)}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(180, 55%, 65%)' }} />
              <span>&lt;10%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(180, 60%, 55%)' }} />
              <span>10-20%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(180, 65%, 45%)' }} />
              <span>20-30%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(180, 70%, 35%)' }} />
              <span>&gt;30%</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-muted-foreground text-xs">Circle size = % share of total orders</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
