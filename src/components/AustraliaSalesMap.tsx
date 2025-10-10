import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOdooSalesByRegion } from "@/hooks/useOdooSalesByRegion";
import { useState } from "react";

export function AustraliaSalesMap() {
  const { regionData, isLoading } = useOdooSalesByRegion();
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Calculate color intensity based on sales
  const maxSales = Math.max(...regionData.map(r => r.sales), 1);
  const getRegionColor = (regionCode: string) => {
    const region = regionData.find(r => r.region === regionCode);
    if (!region) return '#e5e7eb'; // gray-200 for no data
    
    const intensity = (region.sales / maxSales) * 100;
    if (intensity > 75) return '#16a34a'; // green-600
    if (intensity > 50) return '#22c55e'; // green-500
    if (intensity > 25) return '#86efac'; // green-300
    return '#bbf7d0'; // green-200
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
          <svg
            viewBox="0 0 1000 800"
            className="w-full h-auto"
            style={{ maxHeight: '500px' }}
          >
            {/* Western Australia */}
            <path
              d="M 100 100 L 100 500 L 400 500 L 400 100 Z"
              fill={getRegionColor('WA')}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseEnter={() => setHoveredRegion('WA')}
              onMouseLeave={() => setHoveredRegion(null)}
            />
            <text x="250" y="300" textAnchor="middle" fill="#000" fontSize="20" fontWeight="bold">
              WA
            </text>

            {/* Northern Territory */}
            <path
              d="M 400 100 L 400 400 L 550 400 L 550 100 Z"
              fill={getRegionColor('NT')}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseEnter={() => setHoveredRegion('NT')}
              onMouseLeave={() => setHoveredRegion(null)}
            />
            <text x="475" y="250" textAnchor="middle" fill="#000" fontSize="20" fontWeight="bold">
              NT
            </text>

            {/* Queensland */}
            <path
              d="M 550 100 L 550 500 L 750 500 L 750 100 Z"
              fill={getRegionColor('QLD')}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseEnter={() => setHoveredRegion('QLD')}
              onMouseLeave={() => setHoveredRegion(null)}
            />
            <text x="650" y="300" textAnchor="middle" fill="#000" fontSize="20" fontWeight="bold">
              QLD
            </text>

            {/* South Australia */}
            <path
              d="M 400 400 L 400 600 L 550 600 L 550 400 Z"
              fill={getRegionColor('SA')}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseEnter={() => setHoveredRegion('SA')}
              onMouseLeave={() => setHoveredRegion(null)}
            />
            <text x="475" y="500" textAnchor="middle" fill="#000" fontSize="20" fontWeight="bold">
              SA
            </text>

            {/* New South Wales */}
            <path
              d="M 550 500 L 550 650 L 700 650 L 700 500 Z"
              fill={getRegionColor('NSW')}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseEnter={() => setHoveredRegion('NSW')}
              onMouseLeave={() => setHoveredRegion(null)}
            />
            <text x="625" y="575" textAnchor="middle" fill="#000" fontSize="20" fontWeight="bold">
              NSW
            </text>

            {/* Victoria */}
            <path
              d="M 500 600 L 500 700 L 650 700 L 650 600 Z"
              fill={getRegionColor('VIC')}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseEnter={() => setHoveredRegion('VIC')}
              onMouseLeave={() => setHoveredRegion(null)}
            />
            <text x="575" y="650" textAnchor="middle" fill="#000" fontSize="20" fontWeight="bold">
              VIC
            </text>

            {/* Tasmania */}
            <ellipse
              cx="600"
              cy="750"
              rx="50"
              ry="30"
              fill={getRegionColor('TAS')}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseEnter={() => setHoveredRegion('TAS')}
              onMouseLeave={() => setHoveredRegion(null)}
            />
            <text x="600" y="755" textAnchor="middle" fill="#000" fontSize="16" fontWeight="bold">
              TAS
            </text>

            {/* ACT (small dot near NSW) */}
            <circle
              cx="670"
              cy="620"
              r="15"
              fill={getRegionColor('ACT')}
              stroke="#fff"
              strokeWidth="2"
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseEnter={() => setHoveredRegion('ACT')}
              onMouseLeave={() => setHoveredRegion(null)}
            />
            <text x="670" y="625" textAnchor="middle" fill="#000" fontSize="10" fontWeight="bold">
              ACT
            </text>
          </svg>

          {/* Tooltip */}
          {hoveredRegion && getRegionData(hoveredRegion) && (
            <div className="absolute top-4 right-4 bg-background border border-border rounded-lg p-4 shadow-lg">
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
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#bbf7d0' }} />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#86efac' }} />
              <span>Medium-Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
              <span>Medium-High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#16a34a' }} />
              <span>High</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
