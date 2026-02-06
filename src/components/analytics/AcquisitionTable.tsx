import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type TrafficSourceData } from "@/hooks/useWebsiteAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown } from "lucide-react";
import { useState } from "react";

interface AcquisitionTableProps {
  data: TrafficSourceData[];
  isLoading?: boolean;
  title?: string;
  description?: string;
}

type SortField = 'sessions' | 'users' | 'bounceRate' | 'engagementRate';
type SortDirection = 'asc' | 'desc';

export function AcquisitionTable({
  data,
  isLoading,
  title = "Traffic Acquisition Details",
  description = "Detailed breakdown of traffic sources",
}: AcquisitionTableProps) {
  const [sortField, setSortField] = useState<SortField>('sessions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No acquisition data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (aValue - bValue) * multiplier;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Source</TableHead>
                <TableHead className="w-[150px]">Medium</TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort('sessions')}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Sessions
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort('users')}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Users
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">New Users</TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort('bounceRate')}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Bounce Rate
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort('engagementRate')}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Engagement
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.source}</TableCell>
                  <TableCell className="text-muted-foreground">{row.medium}</TableCell>
                  <TableCell className="text-right">{row.sessions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.users.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.newUsers.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={row.bounceRate > 0.7 ? 'text-destructive' : row.bounceRate < 0.3 ? 'text-green-600' : ''}>
                      {(row.bounceRate * 100).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={row.engagementRate > 0.7 ? 'text-green-600' : row.engagementRate < 0.3 ? 'text-destructive' : ''}>
                      {(row.engagementRate * 100).toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
