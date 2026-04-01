"use client";

import { useCallback, useEffect, useState } from "react";

import { repairMojibakeText, repairNullableText } from "@/lib/text-repair";
import { supabase } from "@/lib/supabase";
import type { BatchPreviewRow, BatchRecord } from "./types";

type HistoryParams = {
  historyEnabled: boolean;
  loggedInUser: { user_id: string } | null;
};

const repairBatch = (batch: BatchRecord): BatchRecord => ({
  ...batch,
  accountant_name: repairMojibakeText(batch.accountant_name),
  bp: repairNullableText(batch.bp),
  file_name: repairMojibakeText(batch.file_name),
  note: repairNullableText(batch.note),
});

const repairPreviewRow = (row: BatchPreviewRow): BatchPreviewRow => {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === "string" ? repairMojibakeText(value) : value,
    ]),
  );
};

export function useUploadHistory({
  historyEnabled,
  loggedInUser,
}: HistoryParams) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBatches, setHistoryBatches] = useState<BatchRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewBatch, setPreviewBatch] = useState<BatchRecord | null>(null);
  const [batchRows, setBatchRows] = useState<BatchPreviewRow[]>([]);
  const [batchRowsLoading, setBatchRowsLoading] = useState(false);
  const [uploadRowsPreviewAvailable] = useState(false);
  const [uploadRowsPreviewNotice] = useState<string | null>(
    "Schema moi luu du lieu theo cac fact table. Preview chi tiet batch chua duoc noi vao UI nay.",
  );

  const closePreview = useCallback(() => {
    setPreviewBatch(null);
    setBatchRows([]);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!loggedInUser || !historyEnabled) return;

    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from("upload_batches")
        .select(
          "upload_batch_id, uploaded_by_user_id, uploaded_by_auth, file_name, original_file_name, note, total_rows, success_rows, failed_rows, status, submitted_at, created_at, updated_at",
        )
        .eq("uploaded_by_user_id", loggedInUser.user_id)
        .order("created_at", { ascending: false })
        .limit(50);

      setHistoryBatches(((data ?? []) as BatchRecord[]).map(repairBatch));
    } finally {
      setHistoryLoading(false);
    }
  }, [historyEnabled, loggedInUser]);

  useEffect(() => {
    if (historyOpen) {
      void loadHistory();
    }
  }, [historyOpen, loadHistory]);

  useEffect(() => {
    if (historyEnabled) return;

    setHistoryOpen(false);
    setHistoryBatches([]);
    closePreview();
  }, [closePreview, historyEnabled]);

<<<<<<< Updated upstream
  const handleViewBatch = useCallback((batch: BatchRecord) => {
    setPreviewBatch(batch);
    setBatchRows([]);
    setBatchRowsLoading(false);
  }, []);
=======
  const handleViewBatch = useCallback(
    async (batch: BatchRecord) => {
      if (!uploadRowsPreviewAvailable) return;

      setPreviewBatch(batch);
      setBatchRows([]);
      setBatchRowsLoading(true);

      try {
        const { data, error } = await supabase
          .from("upload_rows")
          .select(
            "file_date, system_code, metric_group, category_name, subcategory_name, amount, attribute_name, content_text, company_name_in_file, data_type, block_name, department_name",
          )
          .eq("batch_id", batch.batch_id)
          .order("row_number")
          .limit(300);

        if (error) {
          const message = error.message.toLowerCase();
          const tableMissing =
            error.code === "PGRST205" ||
            message.includes("upload_rows") ||
            message.includes("does not exist");

          if (tableMissing) {
            setUploadRowsPreviewAvailable(false);
            setUploadRowsPreviewNotice(
              "Live DB chưa có bảng upload_rows. Tạm tắt preview chi tiết lịch sử.",
            );
            closePreview();
            return;
          }

          throw new Error(error.message);
        }

        setBatchRows(((data ?? []) as BatchPreviewRow[]).map(repairPreviewRow));
      } finally {
        setBatchRowsLoading(false);
      }
    },
    [closePreview, uploadRowsPreviewAvailable],
  );
>>>>>>> Stashed changes

  const handlePreviewOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closePreview();
      }
    },
    [closePreview],
  );

  return {
    batchRows,
    batchRowsLoading,
    handlePreviewOpenChange,
    handleViewBatch,
    historyBatches,
    historyLoading,
    historyOpen,
    loadHistory,
    previewBatch,
    setHistoryOpen,
    uploadRowsPreviewAvailable,
    uploadRowsPreviewNotice,
  };
}
