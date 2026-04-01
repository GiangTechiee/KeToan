import {
  Eye,
  FileCheck2,
  FileClock,
  FileSpreadsheet,
  FileX2,
  History,
  Loader2,
  RefreshCw,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Company, UploadBatchStatus } from "@/types/supabase";
import { ROW_COLUMN_MAP, type BatchPreviewRow, type BatchRecord } from "./types";

type UploadHistorySheetProps = {
  allCompanies: Company[];
  batchRows: BatchPreviewRow[];
  batchRowsLoading: boolean;
  canRead: boolean;
  historyBatches: BatchRecord[];
  historyLoading: boolean;
  historyOpen: boolean;
  loggedInUserName: string | null;
  onHistoryOpenChange: (open: boolean) => void;
  onPreviewOpenChange: (open: boolean) => void;
  onRefresh: () => void | Promise<void>;
  onViewBatch: (batch: BatchRecord) => void;
  previewBatch: BatchRecord | null;
  uploadRowsPreviewAvailable: boolean;
  uploadRowsPreviewNotice: string | null;
};

const STATUS_CONFIG: Record<
  UploadBatchStatus,
  { label: string; icon: typeof FileClock; className: string }
> = {
  draft: {
    label: "Nhap",
    icon: FileClock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  validated: {
    label: "Da kiem tra",
    icon: FileCheck2,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  submitted: {
    label: "Da gui",
    icon: FileCheck2,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  failed: {
    label: "Loi",
    icon: FileX2,
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

function BatchPreviewDialog({
  batchRows,
  batchRowsLoading,
  onPreviewOpenChange,
  previewBatch,
}: Pick<
  UploadHistorySheetProps,
  "batchRows" | "batchRowsLoading" | "onPreviewOpenChange" | "previewBatch"
>) {
  return (
    <Dialog open={!!previewBatch} onOpenChange={onPreviewOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            {previewBatch?.file_name}
            <span className="text-muted-foreground font-normal text-xs">
              #{previewBatch?.batch_id.slice(0, 8)} ·{" "}
              {previewBatch?.total_rows?.toLocaleString()} dong
            </span>
          </DialogTitle>
        </DialogHeader>

        {batchRowsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">
              Dang tai du lieu...
            </span>
          </div>
        ) : batchRows.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <FileSpreadsheet className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Khong co du lieu de hien thi
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-[#f4f6fb] hover:bg-[#f4f6fb] border-b border-border/50">
                  <TableHead className="text-[10px] font-bold w-10 px-3 py-2.5 text-center text-muted-foreground">
                    #
                  </TableHead>
                  {ROW_COLUMN_MAP.map(({ label }) => (
                    <TableHead
                      key={label}
                      className="text-[10px] font-bold whitespace-nowrap px-3 py-2.5 text-foreground border-l border-border/30"
                    >
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchRows.map((row, index) => (
                  <TableRow
                    key={index}
                    className={cn(
                      "border-b border-border/30 hover:bg-primary/3",
                      index % 2 === 0 ? "bg-white" : "bg-[#fafbfd]",
                    )}
                  >
                    <TableCell className="text-[10px] text-muted-foreground text-center px-3 py-1.5 font-mono">
                      {index + 1}
                    </TableCell>
                    {ROW_COLUMN_MAP.map(({ db }) => (
                      <TableCell
                        key={db}
                        className="text-[11px] px-3 py-1.5 whitespace-nowrap border-l border-border/20 font-mono"
                      >
                        {row[db] !== null && row[db] !== undefined ? (
                          String(row[db])
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HistoryBatchCard({
  batch,
  canRead,
  companyName,
  onViewBatch,
}: {
  batch: BatchRecord;
  canRead: boolean;
  companyName: string;
  onViewBatch: (batch: BatchRecord) => void;
}) {
  const statusConfig = STATUS_CONFIG[batch.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const createdAt = new Date(batch.created_at).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="border border-border/60 rounded-xl p-3.5 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <StatusIcon className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-xs font-semibold text-foreground truncate max-w-[220px]"
              title={batch.file_name}
            >
              {batch.file_name}
            </p>
            <span
              className={cn(
                "text-[10px] font-medium border px-1.5 py-0.5 rounded-md",
                statusConfig.className,
              )}
            >
              {statusConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground">
              #{batch.batch_id.slice(0, 8)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {createdAt}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {batch.total_rows.toLocaleString()} dong
            </span>
            <span className="text-[10px] text-muted-foreground">
              {companyName}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {batch.cost_center_code}
            </span>
          </div>
        </div>

        {canRead && (
          <button
            onClick={() => onViewBatch(batch)}
            className="shrink-0 flex items-center gap-1 text-[10px] text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-md px-2 py-1 transition-colors"
          >
            <Eye className="w-3 h-3" /> Xem
          </button>
        )}
      </div>
    </div>
  );
}

export function UploadHistorySheet({
  allCompanies,
  batchRows,
  batchRowsLoading,
  canRead,
  historyBatches,
  historyLoading,
  historyOpen,
  loggedInUserName,
  onHistoryOpenChange,
  onPreviewOpenChange,
  onRefresh,
  onViewBatch,
  previewBatch,
  uploadRowsPreviewAvailable,
  uploadRowsPreviewNotice,
}: UploadHistorySheetProps) {
  const canPreviewRows = canRead && uploadRowsPreviewAvailable;

  return (
    <>
      <BatchPreviewDialog
        batchRows={batchRows}
        batchRowsLoading={batchRowsLoading}
        onPreviewOpenChange={onPreviewOpenChange}
        previewBatch={previewBatch}
      />

      <Sheet open={historyOpen} onOpenChange={onHistoryOpenChange}>
        <SheetContent
          className="w-full sm:w-[520px] sm:max-w-[520px] p-0 flex flex-col"
          side="right"
        >
          <SheetHeader className="px-6 py-4 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4 text-primary" />
                Lich su file upload
              </SheetTitle>
              <button
                onClick={() => void onRefresh()}
                disabled={historyLoading}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                title="Lam moi"
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5", historyLoading && "animate-spin")}
                />
              </button>
            </div>

            {loggedInUserName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {loggedInUserName}
              </p>
            )}

            {!uploadRowsPreviewAvailable && uploadRowsPreviewNotice && (
              <p className="text-[11px] text-amber-700 mt-1.5">
                {uploadRowsPreviewNotice}
              </p>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1 px-4 pt-3">
            {historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : historyBatches.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Chua co file nao duoc upload
                </p>
              </div>
            ) : (
              <div className="space-y-2 pb-6">
                {historyBatches.map((batch) => (
                  <HistoryBatchCard
                    key={batch.batch_id}
                    batch={batch}
                    canRead={canPreviewRows}
                    companyName={
                      allCompanies.find(
                        (company) => company.company_id === batch.company_id,
                      )?.company_name ?? String(batch.company_id)
                    }
                    onViewBatch={onViewBatch}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
