import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { LostLead } from "@/hooks/useLostOpportunities";
import LeadDetailCard from "./LeadDetailCard";

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  high_gp: { label: "High GP", color: "bg-amber-100 text-amber-800" },
  high_labour: { label: "High Labour", color: "bg-red-100 text-red-800" },
  high_freight: { label: "High Freight", color: "bg-orange-100 text-orange-800" },
};

const fmt = (v: number) =>
  "$" + Math.abs(v).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface Props {
  leads: LostLead[];
  open: boolean;
  onClose: () => void;
}

export default function OverinflatedJobsModal({ leads, open, onClose }: Props) {
  const [selectedLead, setSelectedLead] = useState<LostLead | null>(null);
  const flaggedLeads = leads.filter((l) => l.flags.length > 0);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSelectedLead(null);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Overinflated Jobs</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {flaggedLeads.length} lost opportunities with high GP, labour, or freight flags
            </p>
          </DialogHeader>
          <div className="overflow-auto flex-1 -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No flagged opportunities.
                    </TableCell>
                  </TableRow>
                ) : (
                  flaggedLeads.map((l) => (
                    <TableRow
                      key={l.id}
                      className="cursor-pointer hover:bg-muted/60"
                      onClick={() => setSelectedLead(l)}
                    >
                      <TableCell className="font-medium text-xs max-w-[200px] truncate">{l.name}</TableCell>
                      <TableCell className="text-xs max-w-[160px] truncate">{l.customer}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] whitespace-nowrap">{l.stage}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {l.flags.map((f) => {
                            const fl = FLAG_LABELS[f];
                            return fl ? (
                              <Badge key={f} className={`${fl.color} text-[9px]`}>{fl.label}</Badge>
                            ) : null;
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {l.revenue > 0 ? fmt(l.revenue) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
      <LeadDetailCard
        lead={selectedLead}
        open={selectedLead !== null}
        onClose={() => setSelectedLead(null)}
      />
    </>
  );
}
