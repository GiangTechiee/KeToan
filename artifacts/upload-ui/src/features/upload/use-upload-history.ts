"use client";

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { BatchPreviewRow, BatchRecord } from "./types";

type HistoryParams = {
  historyEnabled: boolean;
  loggedInUser: { user_id: string } | null;
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
  const [uploadRowsPreviewAvailable, setUploadRowsPreviewAvailable] =
    useState(true);
  const [uploadRowsPreviewNotice, setUploadRowsPreviewNotice] = useState<
    string | null
  >(null);

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
          "batch_id, upload_date, accountant_name, company_id, cost_center_code, bp, file_name, file_type, total_rows, preview_rows, status, uploaded_by, note, created_at, updated_at",
        )
        .eq("uploaded_by", loggedInUser.user_id)
        .order("created_at", { ascending: false })
        .limit(50);

      setHistoryBatches((data ?? []) as BatchRecord[]);
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
              "Live DB chua co bang upload_rows. Tam tat preview chi tiet lich su.",
            );
            closePreview();
            return;
          }

          throw new Error(error.message);
        }

        setBatchRows((data ?? []) as BatchPreviewRow[]);
      } finally {
        setBatchRowsLoading(false);
      }
    },
    [closePreview, uploadRowsPreviewAvailable],
  );

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
