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
  const endHeight = 929; // Simplified - would need formula
  const manDays = 4;
  const platformWeight = (platformArea * 14); // Simplified kg calculation

  // EasyMech CR state
  const [crWidth, setCrWidth] = useState(6000);
  const [crLength, setCrLength] = useState(13800);
  const [crFlooring, setCrFlooring] = useState("Mesh");
  const [crLoadRating, setCrLoadRating] = useState(2.5);

  const crPlatformArea = (crWidth * crLength) / 1000000;
  const crPlatformWeight = (crPlatformArea * 12);

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
                      <span>$9,951.36</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Production Labour</span>
                      <span>$1,194.16</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Engineering Labour</span>
                      <span>$1,492.70</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Packaging & Consumables</span>
                      <span>$208.98</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">COGS Running Costs</span>
                      <span>$258.74</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                      <span>Total Cost Price</span>
                      <span>$13,105.94</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-primary">
                      <span>Total Sale Price</span>
                      <span>$23,828.98</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>GP %</span>
                      <span>45%</span>
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
                      <span>$10,847.86</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-primary">
                      <span>Total Sale Price</span>
                      <span>$19,723.38</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Span+ */}
          <TabsContent value="span">
            <Card>
              <CardHeader>
                <CardTitle>Span+ Calculator</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Span+ calculator coming soon. Ask the AI assistant for details about this calculator.
                </p>
              </CardContent>
            </Card>
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
