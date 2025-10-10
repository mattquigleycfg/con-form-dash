import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Calculator as CalcIcon } from "lucide-react";

export default function Calculator() {
  // EasyMech MR state
  const [mrPitch, setMrPitch] = useState(3);
  const [mrWidth, setMrWidth] = useState(12000);
  const [mrLength, setMrLength] = useState(11400);
  const [mrStartHeight, setMrStartHeight] = useState(300);
  const [mrRoofType, setMrRoofType] = useState("Kliplok 700");
  const [mrFlooring, setMrFlooring] = useState("Mesh");
  const [mrLoadRating, setMrLoadRating] = useState(2.5);

  // Calculated values for MR
  const platformArea = (mrWidth * mrLength) / 1000000; // m²
  const endHeight = mrStartHeight + (mrLength * Math.tan((mrPitch * Math.PI) / 180));
  const manDays = Math.ceil(platformArea / 30); // Approx 30m² per day
  const platformWeight = platformArea * 14;

  // Price calculations for MR
  const mrPlatformCost = platformArea * 72.50;
  const mrProductionLabour = manDays * 298.54;
  const mrEngineeringLabour = platformArea * 10.88;
  const mrPackaging = platformArea * 1.52;
  const mrCogsRunning = platformArea * 1.89;
  const mrTotalCostPrice = mrPlatformCost + mrProductionLabour + mrEngineeringLabour + mrPackaging + mrCogsRunning;
  const mrTotalSalePrice = mrTotalCostPrice / 0.55; // 45% GP
  const mrGpPercent = ((mrTotalSalePrice - mrTotalCostPrice) / mrTotalSalePrice) * 100;

  // EasyMech CR state
  const [crWidth, setCrWidth] = useState(6000);
  const [crLength, setCrLength] = useState(13800);
  const [crFlooring, setCrFlooring] = useState("Mesh");
  const [crLoadRating, setCrLoadRating] = useState(2.5);

  const crPlatformArea = (crWidth * crLength) / 1000000;
  const crPlatformWeight = crPlatformArea * 12;

  // Price calculations for CR
  const crManDays = Math.ceil(crPlatformArea / 35); // Approx 35m² per day for CR
  const crPlatformCost = crPlatformArea * 65.20;
  const crProductionLabour = crManDays * 298.54;
  const crEngineeringLabour = crPlatformArea * 9.50;
  const crPackaging = crPlatformArea * 1.35;
  const crCogsRunning = crPlatformArea * 1.67;
  const crTotalCostPrice = crPlatformCost + crProductionLabour + crEngineeringLabour + crPackaging + crCogsRunning;
  const crTotalSalePrice = crTotalCostPrice / 0.55; // 45% GP

  // Span+ state
  const [spanWidth, setSpanWidth] = useState(1200);
  const [spanLength, setSpanLength] = useState(6000);
  const [spanHeight, setSpanHeight] = useState(2000);
  const [spanLoadRating, setSpanLoadRating] = useState(2.5);
  const [spanHandrails, setSpanHandrails] = useState("Both Sides");
  const [spanAccess, setSpanAccess] = useState("Ladder");

  // Calculated values for Span+
  const spanArea = (spanWidth * spanLength) / 1000000;
  const spanWeight = spanArea * 18; // kg/m² for Span+
  const spanLinearMeters = (spanWidth + spanLength) * 2 / 1000;
  
  // Price calculations for Span+
  const spanPlatformCost = spanArea * 85.40;
  const spanHandrailCost = spanHandrails === "Both Sides" ? spanLinearMeters * 45.20 : spanLinearMeters * 22.60;
  const spanAccessCost = spanAccess === "Stairs" ? 1250 : spanAccess === "Ladder" ? 380 : 0;
  const spanManDays = Math.ceil(spanArea / 25 + (spanAccess === "Stairs" ? 0.5 : 0.2));
  const spanProductionLabour = spanManDays * 298.54;
  const spanEngineeringLabour = spanArea * 12.30;
  const spanPackaging = spanArea * 1.75;
  const spanCogsRunning = spanArea * 2.10;
  const spanTotalCostPrice = spanPlatformCost + spanHandrailCost + spanAccessCost + spanProductionLabour + spanEngineeringLabour + spanPackaging + spanCogsRunning;
  const spanTotalSalePrice = spanTotalCostPrice / 0.55; // 45% GP
  const spanGpPercent = ((spanTotalSalePrice - spanTotalCostPrice) / spanTotalSalePrice) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <CalcIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Con-form Estimator
            </h1>
            <p className="text-muted-foreground mt-2">
              Calculate costs for platforms, screens, and walkway systems
            </p>
          </div>
        </div>

        <Tabs defaultValue="easymech-mr" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="easymech-mr">EasyMech MR</TabsTrigger>
            <TabsTrigger value="easymech-cr">EasyMech CR</TabsTrigger>
            <TabsTrigger value="span">Span+</TabsTrigger>
            <TabsTrigger value="screens">Screens</TabsTrigger>
          </TabsList>

          {/* EasyMech MR */}
          <TabsContent value="easymech-mr" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Inputs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="mr-pitch">Pitch (Degrees)</Label>
                    <Input
                      id="mr-pitch"
                      type="number"
                      value={mrPitch}
                      onChange={(e) => setMrPitch(Number(e.target.value))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="mr-width">Width (mm)</Label>
                    <Input
                      id="mr-width"
                      type="number"
                      value={mrWidth}
                      onChange={(e) => setMrWidth(Number(e.target.value))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="mr-length">Length (mm)</Label>
                    <Input
                      id="mr-length"
                      type="number"
                      value={mrLength}
                      onChange={(e) => setMrLength(Number(e.target.value))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="mr-start-height">Start Height (mm)</Label>
                    <Input
                      id="mr-start-height"
                      type="number"
                      value={mrStartHeight}
                      onChange={(e) => setMrStartHeight(Number(e.target.value))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="mr-roof-type">Roof Type</Label>
                    <Select value={mrRoofType} onValueChange={setMrRoofType}>
                      <SelectTrigger id="mr-roof-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kliplok 700">Kliplok 700</SelectItem>
                        <SelectItem value="Trimdek">Trimdek</SelectItem>
                        <SelectItem value="Corrugated">Corrugated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="mr-flooring">Flooring</Label>
                    <Select value={mrFlooring} onValueChange={setMrFlooring}>
                      <SelectTrigger id="mr-flooring">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mesh">Mesh</SelectItem>
                        <SelectItem value="Plywood">Plywood</SelectItem>
                        <SelectItem value="Steel Plate">Steel Plate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="mr-load-rating">Load Rating (kPa)</Label>
                    <Select value={String(mrLoadRating)} onValueChange={(v) => setMrLoadRating(Number(v))}>
                      <SelectTrigger id="mr-load-rating">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2.5">2.5</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="7.5">7.5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Calculated Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Platform Area</span>
                    <span className="font-semibold">{platformArea.toFixed(1)} m²</span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">End Height</span>
                    <span className="font-semibold">{endHeight} mm</span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Man Days</span>
                    <span className="font-semibold">{manDays} Days</span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Platform Weight</span>
                    <span className="font-semibold">{platformWeight.toFixed(1)} Kg</span>
                  </div>

                  <div className="mt-6 space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Platform</span>
                      <span>${mrPlatformCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Production Labour</span>
                      <span>${mrProductionLabour.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Engineering Labour</span>
                      <span>${mrEngineeringLabour.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Packaging & Consumables</span>
                      <span>${mrPackaging.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">COGS Running Costs</span>
                      <span>${mrCogsRunning.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                      <span>Total Cost Price</span>
                      <span>${mrTotalCostPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-primary">
                      <span>Total Sale Price</span>
                      <span>${mrTotalSalePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>GP %</span>
                      <span>{mrGpPercent.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* EasyMech CR */}
          <TabsContent value="easymech-cr" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Inputs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cr-width">Width (mm)</Label>
                    <Input
                      id="cr-width"
                      type="number"
                      value={crWidth}
                      onChange={(e) => setCrWidth(Number(e.target.value))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="cr-length">Length (mm)</Label>
                    <Input
                      id="cr-length"
                      type="number"
                      value={crLength}
                      onChange={(e) => setCrLength(Number(e.target.value))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="cr-flooring">Flooring</Label>
                    <Select value={crFlooring} onValueChange={setCrFlooring}>
                      <SelectTrigger id="cr-flooring">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mesh">Mesh</SelectItem>
                        <SelectItem value="Plywood">Plywood</SelectItem>
                        <SelectItem value="Steel Plate">Steel Plate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="cr-load-rating">Load Rating (kPa)</Label>
                    <Select value={String(crLoadRating)} onValueChange={(v) => setCrLoadRating(Number(v))}>
                      <SelectTrigger id="cr-load-rating">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2.5">2.5</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="7.5">7.5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Calculated Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Platform Area</span>
                    <span className="font-semibold">{crPlatformArea.toFixed(1)} m²</span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Platform Weight</span>
                    <span className="font-semibold">{crPlatformWeight.toFixed(1)} Kg</span>
                  </div>

                  <div className="mt-6 space-y-2 border-t pt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Cost Price</span>
                      <span>${crTotalCostPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-primary">
                      <span>Total Sale Price</span>
                      <span>${crTotalSalePrice.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Span+ */}
          <TabsContent value="span" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Walkway System Inputs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="span-width">Width (mm)</Label>
                    <Input
                      id="span-width"
                      type="number"
                      value={spanWidth}
                      onChange={(e) => setSpanWidth(Number(e.target.value))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="span-length">Length (mm)</Label>
                    <Input
                      id="span-length"
                      type="number"
                      value={spanLength}
                      onChange={(e) => setSpanLength(Number(e.target.value))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="span-height">Height (mm)</Label>
                    <Input
                      id="span-height"
                      type="number"
                      value={spanHeight}
                      onChange={(e) => setSpanHeight(Number(e.target.value))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="span-load-rating">Load Rating (kPa)</Label>
                    <Select value={String(spanLoadRating)} onValueChange={(v) => setSpanLoadRating(Number(v))}>
                      <SelectTrigger id="span-load-rating">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2.5">2.5</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="7.5">7.5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="span-handrails">Handrails</Label>
                    <Select value={spanHandrails} onValueChange={setSpanHandrails}>
                      <SelectTrigger id="span-handrails">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Both Sides">Both Sides</SelectItem>
                        <SelectItem value="One Side">One Side</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="span-access">Access Type</Label>
                    <Select value={spanAccess} onValueChange={setSpanAccess}>
                      <SelectTrigger id="span-access">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ladder">Ladder</SelectItem>
                        <SelectItem value="Stairs">Stairs</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Calculated Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Walkway Area</span>
                    <span className="font-semibold">{spanArea.toFixed(1)} m²</span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Linear Meters</span>
                    <span className="font-semibold">{spanLinearMeters.toFixed(1)} m</span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Man Days</span>
                    <span className="font-semibold">{spanManDays} Days</span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">System Weight</span>
                    <span className="font-semibold">{spanWeight.toFixed(1)} Kg</span>
                  </div>

                  <div className="mt-6 space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Platform</span>
                      <span>${spanPlatformCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Handrails</span>
                      <span>${spanHandrailCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Access System</span>
                      <span>${spanAccessCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Production Labour</span>
                      <span>${spanProductionLabour.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Engineering Labour</span>
                      <span>${spanEngineeringLabour.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Packaging & Consumables</span>
                      <span>${spanPackaging.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">COGS Running Costs</span>
                      <span>${spanCogsRunning.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                      <span>Total Cost Price</span>
                      <span>${spanTotalCostPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-primary">
                      <span>Total Sale Price</span>
                      <span>${spanTotalSalePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>GP %</span>
                      <span>{spanGpPercent.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Screens */}
          <TabsContent value="screens">
            <Card>
              <CardHeader>
                <CardTitle>Screen Systems</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Screen calculators (Classic, RF, Acoustic+, Guardrail) coming soon. Ask the AI assistant for details.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
