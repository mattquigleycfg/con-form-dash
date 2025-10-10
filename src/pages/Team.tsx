import { DashboardLayout } from "@/components/DashboardLayout";
import { PerformanceTable } from "@/components/PerformanceTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOdooTeam, SalesRep } from "@/hooks/useOdooTeam";
import { FilterBar } from "@/components/filters/FilterBar";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Team() {
  const { salesReps, isLoading } = useOdooTeam();
  const [searchQuery, setSearchQuery] = useState("");
  const [performanceFilter, setPerformanceFilter] = useState<"all" | "above" | "below">("all");
  const [sortBy, setSortBy] = useState<"revenue" | "deals" | "performance">("revenue");
  
  // Filter and sort sales reps
  const filteredAndSortedReps = useMemo(() => {
    let filtered = [...salesReps];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(rep =>
        rep.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Performance filter
    if (performanceFilter === "above") {
      filtered = filtered.filter(rep => rep.revenue >= rep.target);
    } else if (performanceFilter === "below") {
      filtered = filtered.filter(rep => rep.revenue < rep.target);
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return b.revenue - a.revenue;
        case "deals":
          return b.deals - a.deals;
        case "performance":
          return (b.revenue / b.target) - (a.revenue / a.target);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [salesReps, searchQuery, performanceFilter, sortBy]);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Team Performance</h1>
        <p className="mt-1 text-muted-foreground">
          Track individual and team metrics
        </p>
      </div>

      <FilterBar />

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="search">Search Team Member</Label>
          <Input
            id="search"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="performance">Performance Filter</Label>
          <Select value={performanceFilter} onValueChange={(value: any) => setPerformanceFilter(value)}>
            <SelectTrigger id="performance">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Team Members</SelectItem>
              <SelectItem value="above">Above Target</SelectItem>
              <SelectItem value="below">Below Target</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="sort">Sort By</Label>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger id="sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="deals">Deals Closed</SelectItem>
              <SelectItem value="performance">Performance %</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <PerformanceTable salesReps={filteredAndSortedReps} isLoading={isLoading} />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>This month's leaders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAndSortedReps.slice(0, 3).map((rep, idx) => (
                  <div
                    key={rep.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{rep.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {idx === 0 ? "Revenue" : idx === 1 ? "Deals Closed" : "Performance"}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {idx === 0 ? `$${Math.round(rep.revenue / 1000)}K` : idx === 1 ? rep.deals : `${Math.round((rep.revenue / rep.target) * 100)}%`}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Activity</CardTitle>
              <CardDescription>Recent achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAndSortedReps.slice(0, 3).map((rep, i) => (
                  <div
                    key={rep.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {rep.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {rep.deals} deals closed • ${Math.round(rep.revenue / 1000)}K revenue
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rep.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
