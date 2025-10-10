import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar } from "@/components/filters/FilterBar";
import { useOdooHelpdesk } from "@/hooks/useOdooHelpdesk";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function HelpdeskDashboard() {
  const { data: tickets, isLoading } = useOdooHelpdesk();

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      "0": "secondary",
      "1": "default",
      "2": "destructive",
      "3": "destructive",
    };
    const labels: Record<string, string> = {
      "0": "Low",
      "1": "Medium",
      "2": "High",
      "3": "Urgent",
    };
    return <Badge variant={variants[priority] || "default"}>{labels[priority] || priority}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Support Tickets</h1>
          <p className="text-muted-foreground mt-2">
            Manage open support tickets and customer inquiries
          </p>
        </div>

        <FilterBar />

        <Card>
          <CardHeader>
            <CardTitle>Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets?.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.id}</TableCell>
                      <TableCell>{ticket.name}</TableCell>
                      <TableCell>{ticket.partner_id ? ticket.partner_id[1] : "-"}</TableCell>
                      <TableCell>{ticket.user_id ? ticket.user_id[1] : "Unassigned"}</TableCell>
                      <TableCell>{ticket.team_id ? ticket.team_id[1] : "-"}</TableCell>
                      <TableCell>{ticket.stage_id[1]}</TableCell>
                      <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                      <TableCell>{new Date(ticket.create_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
