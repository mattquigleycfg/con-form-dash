import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { StageSuccess } from "@/hooks/useLostOpportunities";

interface Props {
  conversionRate: number;
  conversionRateExclTender: number;
  wonCount: number;
  totalLost: number;
  byStageSuccess: StageSuccess[];
  open: boolean;
  onClose: () => void;
}

export default function ConversionRateModal({
  conversionRate,
  conversionRateExclTender,
  wonCount,
  totalLost,
  byStageSuccess,
  open,
  onClose,
}: Props) {
  const totalResolved = wonCount + totalLost;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Conversion Rate by Stage</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Success rate = Won / (Won + Lost) per stage
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Overall</p>
              <p className="text-xl font-bold">
                {conversionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {wonCount} won / {totalResolved} resolved
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Excluding Tender Stage</p>
              <p className="text-xl font-bold">
                {conversionRateExclTender.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                Tender stage excluded from both won and lost counts
              </p>
            </div>
          </div>

          <div className="overflow-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Lost</TableHead>
                  <TableHead className="text-right">Success Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byStageSuccess.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No stage data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  byStageSuccess.map((row) => (
                    <TableRow key={row.stage}>
                      <TableCell className="font-medium">{row.stage}</TableCell>
                      <TableCell className="text-right">{row.won_count}</TableCell>
                      <TableCell className="text-right">{row.lost_count}</TableCell>
                      <TableCell className="text-right font-medium">
                        {row.success_rate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
