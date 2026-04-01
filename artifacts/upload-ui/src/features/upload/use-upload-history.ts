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

  const handleViewBatch = useCallback((batch: BatchRecord) => {
    setPreviewBatch(batch);
    setBatchRows([]);
    setBatchRowsLoading(false);
  }, []);

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
