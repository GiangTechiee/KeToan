import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import * as XLSX from "xlsx";

import { getFactConfig } from "@/data/factRegistry";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { UploadBatchInsert } from "@/types/supabase";
import {
  detectFactFromMatrix,
  getFallbackFact,
  getLocalISODate,
  isEmptyMatrixRow,
  mapRowToInsert,
  normalizeRowsByHeaders,
} from "./file-utils";
import type {
  FilterScope,
  ImportTargetValue,
  RowData,
  ValidationStatus,
} from "./types";
import { validateDataAgainstFilters } from "./validation";

type WorkflowParams = {
  canCreate: boolean;
  loggedInUser: { user_id: string; full_name: string } | null;
  masterDataNotice: string | null;
  onSubmitted?: () => void | Promise<void>;
  resolvedCCId: string | null;
  resolvedCompanyId: number | null;
  scope: FilterScope;
  selectedCCId: string;
  selectedCompanyId: string;
  selectedPlan: { plan_name: string } | null | undefined;
  selectedPlanId: string;
};

export function useUploadWorkflow({
  canCreate,
  loggedInUser,
  masterDataNotice,
  onSubmitted,
  resolvedCCId,
  resolvedCompanyId,
  scope,
  selectedCCId,
  selectedCompanyId,
  selectedPlan,
  selectedPlanId,
}: WorkflowParams) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeImportTarget, setActiveImportTarget] =
    useState<ImportTargetValue | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [rows, setRows] = useState<RowData[]>([]);
  const [allParsedRows, setAllParsedRows] = useState<RowData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [validationStatus, setValidationStatus] =
    useState<ValidationStatus>("idle");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const activeTarget = useMemo(
    () => (activeImportTarget ? getFactConfig(activeImportTarget) : null),
    [activeImportTarget],
  );

  const headersAreExact = useCallback(() => {
    const requiredColumns = activeTarget?.requiredColumns ?? [];
    if (!requiredColumns.length || headers.length !== requiredColumns.length) {
      return false;
    }

    return requiredColumns.every((header, index) => headers[index] === header);
  }, [activeTarget, headers]);

  const clearUploadSelection = useCallback(() => {
    setUploadFile(null);
    setFileName("");
    setFileSize(0);
  }, []);

  const clearParsedRows = useCallback(() => {
    setActiveImportTarget(null);
    setTotalRows(0);
    setRows([]);
    setAllParsedRows([]);
    setHeaders([]);
  }, []);

  const handleClearFile = useCallback(() => {
    clearUploadSelection();
    clearParsedRows();
    setValidationStatus("idle");
    setValidationErrors([]);
    setValidationWarnings([]);
  }, [clearParsedRows, clearUploadSelection]);

  const parseFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
        clearUploadSelection();
        clearParsedRows();
        setValidationStatus("invalid");
        setValidationWarnings([]);
        setValidationErrors(["Chi chap nhan file CSV hoac XLSX/XLS."]);
        return;
      }

      setUploadFile(file);
      setFileName(file.name);
      setFileSize(file.size);
      setValidationStatus("validating");
      setValidationErrors([]);
      setValidationWarnings([]);

      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, {
          type: "array",
          cellDates: true,
        });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrixData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: false,
          dateNF: "dd/mm/yyyy",
          blankrows: false,
          defval: "",
        }) as (string | number | boolean | Date | null | undefined)[][];

        if (!matrixData.length) {
          clearParsedRows();
          setValidationStatus("invalid");
          setValidationWarnings([]);
          setValidationErrors(["File khong co du lieu."]);
          return;
        }

        const detectedFact = detectFactFromMatrix(matrixData);
        if (!detectedFact) {
          clearParsedRows();
          setValidationStatus("invalid");
          setValidationWarnings([]);
          setValidationErrors(["Khong tu nhan dien duoc fact tu header workbook."]);
          return;
        }

        const { factConfig, headerCandidate } = detectedFact;
        const fileHeaders = headerCandidate.headers;
        const structuralErrors: string[] = [];

        setActiveImportTarget(factConfig.value);

        const missingColumns = factConfig.requiredColumns.filter(
          (column) => !fileHeaders.includes(column),
        );

        if (missingColumns.length) {
          structuralErrors.push(
            `Thieu ${missingColumns.length} cot: ${missingColumns.join(", ")}`,
          );
        }

        if (!missingColumns.length) {
          const orderErrors = factConfig.requiredColumns.flatMap(
            (column, expectedIndex) => {
              const actualIndex = fileHeaders.indexOf(column);
              return actualIndex !== expectedIndex
                ? [
                    `"${column}" (vi tri ${actualIndex + 1}, can ${expectedIndex + 1})`,
                  ]
                : [];
            },
          );

          if (orderErrors.length) {
            structuralErrors.push(
              `Sai thu tu ${orderErrors.length} cot: ${orderErrors.join("; ")}`,
            );
          }
        }

        const extraColumns = fileHeaders.filter(
          (column) => !factConfig.requiredColumns.includes(column),
        );

        if (extraColumns.length) {
          structuralErrors.push(
            `${extraColumns.length} cot khong nhan dang: ${extraColumns.join(", ")}`,
          );
        }

        if (structuralErrors.length) {
          clearParsedRows();
          setValidationStatus("invalid");
          setValidationWarnings([]);
          setValidationErrors(structuralErrors);
          return;
        }

        const dataRows = matrixData
          .slice(headerCandidate.rowIndex + 1)
          .filter((row) => !isEmptyMatrixRow(row));
        const normalizedRows = normalizeRowsByHeaders(dataRows, fileHeaders);
        const dataErrors = validateDataAgainstFilters(
          normalizedRows,
          selectedCompanyId,
          selectedCCId,
          selectedPlanId,
          factConfig.value,
          scope,
        );

        if (dataErrors.length && !masterDataNotice) {
          clearParsedRows();
          setValidationStatus("invalid");
          setValidationWarnings([]);
          setValidationErrors(dataErrors);
          return;
        }

        setTotalRows(normalizedRows.length);
        setHeaders(fileHeaders);
        setAllParsedRows(normalizedRows);
        setRows(normalizedRows.slice(0, 200));
        setValidationStatus("valid");
        setValidationErrors([]);
        setValidationWarnings(masterDataNotice ? dataErrors : []);
      } catch {
        clearParsedRows();
        setValidationStatus("invalid");
        setValidationWarnings([]);
        setValidationErrors(["Khong the doc file. Hay kiem tra lai dinh dang file."]);
      }
    },
    [
      clearParsedRows,
      clearUploadSelection,
      masterDataNotice,
      scope,
      selectedCCId,
      selectedCompanyId,
      selectedPlanId,
    ],
  );

  useEffect(() => {
    if (
      !fileName ||
      validationStatus === "idle" ||
      validationStatus === "validating" ||
      !allParsedRows.length ||
      !activeImportTarget
    ) {
      return;
    }

    const dataErrors = validateDataAgainstFilters(
      allParsedRows,
      selectedCompanyId,
      selectedCCId,
      selectedPlanId,
      activeImportTarget,
      scope,
    );

    if (dataErrors.length) {
      if (masterDataNotice) {
        setValidationWarnings(dataErrors);
        setValidationErrors([]);
        setValidationStatus("valid");
        return;
      }

      clearParsedRows();
      setValidationWarnings([]);
      setValidationErrors(dataErrors);
      setValidationStatus("invalid");
      return;
    }

    setValidationWarnings([]);
    setValidationErrors([]);
    setValidationStatus("valid");
  }, [
    activeImportTarget,
    allParsedRows,
    clearParsedRows,
    fileName,
    masterDataNotice,
    scope,
    selectedCCId,
    selectedCompanyId,
    selectedPlanId,
    validationStatus,
  ]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void parseFile(file);
      }
      event.target.value = "";
    },
    [parseFile],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);

      const file = event.dataTransfer.files?.[0];
      if (file) {
        void parseFile(file);
      }
    },
    [parseFile],
  );

  const handleSubmit = useCallback(async () => {
    if (!activeTarget?.supported) return;
    if (!loggedInUser || !canCreate || !resolvedCompanyId || !resolvedCCId) {
      return;
    }
    if (validationStatus !== "valid" || !uploadFile || !allParsedRows.length) {
      return;
    }
    if (!headersAreExact()) return;

    setIsSubmitting(true);

    try {
      const uploadDate = getLocalISODate();
      const { data: duplicateRows, error: duplicateError } = await supabase
        .from("upload_batches")
        .select("batch_id")
        .eq("upload_date", uploadDate)
        .eq("uploaded_by", loggedInUser.user_id)
        .eq("company_id", resolvedCompanyId)
        .eq("cost_center_code", resolvedCCId)
        .limit(1);

      if (duplicateError) {
        throw new Error(duplicateError.message);
      }

      if (duplicateRows?.length) {
        throw new Error("Da ton tai batch trung cong ty va cost center trong ngay.");
      }

      const fileExtension = fileName.split(".").pop()?.toLowerCase() ?? null;
      const batchPayload: UploadBatchInsert = {
        upload_date: uploadDate,
        accountant_name: loggedInUser.full_name,
        company_id: resolvedCompanyId,
        cost_center_code: resolvedCCId,
        bp: selectedPlan?.plan_name ?? null,
        file_name: fileName,
        file_type: fileExtension,
        total_rows: allParsedRows.length,
        preview_rows: Math.min(allParsedRows.length, 200),
        status: "submitted",
        uploaded_by: loggedInUser.user_id,
        note: null,
      };

      const { data: insertedBatch, error: batchError } = await supabase
        .from("upload_batches")
        .insert(batchPayload)
        .select("batch_id")
        .single();

      if (batchError || !insertedBatch) {
        throw new Error(batchError?.message ?? "Khong the tao batch upload.");
      }

      const rowPayload = allParsedRows.map((row, index) =>
        mapRowToInsert(
          row,
          activeImportTarget ?? getFallbackFact(),
          insertedBatch.batch_id,
          index + 1,
        ),
      );

      for (let index = 0; index < rowPayload.length; index += 500) {
        const chunk = rowPayload.slice(index, index + 500);
        const { error: rowError } = await supabase.from("upload_rows").insert(chunk);

        if (!rowError) continue;

        const message = rowError.message.toLowerCase();
        const tableMissing =
          rowError.code === "PGRST205" ||
          message.includes("upload_rows") ||
          message.includes("does not exist");

        if (tableMissing) {
          toast({
            title: "Submit thanh cong",
            description:
              "Batch da duoc tao, nhung live DB chua co bang upload_rows de luu preview tung dong.",
          });
          handleClearFile();
          if (onSubmitted) {
            await onSubmitted();
          }
          return;
        }

        throw new Error(rowError.message);
      }

      handleClearFile();
      if (onSubmitted) {
        await onSubmitted();
      }
      toast({ title: "Submit thanh cong" });
    } catch (error) {
      toast({
        title: "Submit that bai",
        description:
          error instanceof Error ? error.message : "Loi khong xac dinh",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activeImportTarget,
    activeTarget,
    allParsedRows,
    canCreate,
    fileName,
    handleClearFile,
    headersAreExact,
    loggedInUser,
    onSubmitted,
    resolvedCCId,
    resolvedCompanyId,
    selectedPlan,
    toast,
    uploadFile,
    validationStatus,
  ]);

  const canSubmit =
    !!loggedInUser &&
    !!resolvedCompanyId &&
    !!resolvedCCId &&
    !!activeTarget &&
    activeTarget.supported &&
    validationStatus === "valid" &&
    !!uploadFile &&
    allParsedRows.length > 0 &&
    !isSubmitting;

  return {
    activeTarget,
    canSubmit,
    fileInputRef,
    fileName,
    fileSize,
    handleClearFile,
    handleDrop,
    handleFileChange,
    handleSubmit,
    headers,
    isDragging,
    isSubmitting,
    rows,
    setIsDragging,
    totalRows,
    validationErrors,
    validationStatus,
    validationWarnings,
  };
}
