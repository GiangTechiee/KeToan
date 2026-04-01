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

import { ALL, getFactConfig } from "@/data/factRegistry";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { UploadBatchFactInsert, UploadBatchInsert } from "@/types/supabase";
import {
  detectFactFromMatrix,
  getCellString,
  isEmptyMatrixRow,
  normalizeRowsByHeaders,
  parseAmount,
  parseFileDate,
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
  resolvedCompanyId: string | null;
  scope: FilterScope;
  selectedCCId: string;
  selectedCompanyId: string;
  selectedPlanId: string;
};

type FactRegistryRecord = {
  fact_id: number;
  table_name: string;
};

type SupportedFactConfig = {
  tableName: string;
  rowsBuilder: (params: {
    companyId: string;
    costCenterId: string;
    factId: number;
    planId: number;
    rows: RowData[];
    uploadBatchId: number;
    userName: string;
  }) => Record<string, unknown>[];
};

const buildHQKDRows: SupportedFactConfig["rowsBuilder"] = ({
  companyId,
  costCenterId,
  factId,
  planId,
  rows,
  uploadBatchId,
  userName,
}) =>
  rows.map((row, index) => ({
    upload_batch_id: uploadBatchId,
    fact_id: factId,
    data_date: parseFileDate(getCellString(row, ["Ngay", "NgÃ y"])),
    cl_indicator_id: getCellString(row, ["Ma he thong", "Mã hệ thống", "MÃ£ hệ thống"]),
    rw_indicator_group: getCellString(row, [
      "Nhom chi tieu",
      "Nhóm chỉ tiêu",
      "NhÃ³m chỉ tiêu",
    ]),
    rw_indicator_item: getCellString(row, ["Khoan muc", "Khoản mục", "Khoáº£n má»¥c"]),
    rw_indicator_sub_item: getCellString(row, [
      "Tieu muc",
      "Tiểu mục",
      "Tiá»ƒu má»¥c",
    ]),
    is_input_allowed: getCellString(row, [
      "Thuoc tinh",
      "Thuộc tính",
      "Thuá»™c tÃ­nh",
    ]),
    content_name: getCellString(row, ["Noi dung", "Nội dung", "Ná»™i dung"]),
    company_id: companyId,
    scenario: getCellString(row, [
      "Loai du lieu",
      "Loại dữ liệu",
      "Loáº¡i dá»¯ liá»‡u",
    ]),
    plan_id: planId,
    cost_center_id: costCenterId,
    amount: parseAmount(getCellString(row, ["So tien", "Số tiền", "Sá»‘ tiá»n"])),
    input_by: userName,
    source_row_no: index + 1,
  }));

const buildSDTienRows: SupportedFactConfig["rowsBuilder"] = ({
  companyId,
  costCenterId,
  factId,
  planId,
  rows,
  uploadBatchId,
  userName,
}) =>
  rows.map((row, index) => ({
    upload_batch_id: uploadBatchId,
    fact_id: factId,
    data_date: parseFileDate(getCellString(row, ["Ngay", "NgÃ y"])),
    indicator_group: getCellString(row, [
      "Nhom chi tieu",
      "Nhóm chỉ tiêu",
      "NhÃ³m chỉ tiêu",
    ]),
    money_type: getCellString(row, [
      "Loai tien",
      "Loại tiền",
      "Loáº¡i tiá»n",
    ]),
    company_name_in_file: getCellString(row, [
      "Cong ty",
      "Công ty",
      "CÃ´ng ty",
      "Cong ty (2)",
      "Công ty (2)",
      "CÃ´ng ty (2)",
    ]),
    bank_name: getCellString(row, ["Ngan hang", "Ngân hàng", "NgÃ¢n hÃ ng"]),
    attribute_text: getCellString(row, [
      "Thuoc tinh",
      "Thuộc tính",
      "Thuá»™c tÃ­nh",
    ]),
    company_id: companyId,
    scenario: getCellString(row, [
      "Loai du lieu",
      "Loại dữ liệu",
      "Loáº¡i dá»¯ liá»‡u",
    ]),
    plan_id: planId,
    cost_center_id: costCenterId,
    amount: parseAmount(getCellString(row, ["So tien", "Số tiền", "Sá»‘ tiá»n"])),
    variance_amount: parseAmount(
      getCellString(row, ["Chenh lech", "Chênh lệch", "ChÃªnh lá»‡ch"]),
    ),
    created_by: userName,
    created_time: new Date().toISOString(),
    source_row_no: index + 1,
  }));

const buildThuChiRows: SupportedFactConfig["rowsBuilder"] = ({
  companyId,
  costCenterId,
  factId,
  planId,
  rows,
  uploadBatchId,
}) =>
  rows.map((row, index) => ({
    upload_batch_id: uploadBatchId,
    fact_id: factId,
    data_date: parseFileDate(getCellString(row, ["Ngay", "NgÃ y"])),
    indicator_group: getCellString(row, [
      "Nhom chi tieu",
      "Nhóm chỉ tiêu",
      "NhÃ³m chỉ tiêu",
    ]),
    category_name: getCellString(row, ["Danh muc", "Danh mục", "Danh má»¥c"]),
    source_name: getCellString(row, ["Nguon", "Nguồn"]),
    business_block_name: getCellString(row, ["Khoi", "Khối", "Khá»‘i"]),
    facility_name: getCellString(row, ["Co so", "Cơ sở", "CÆ¡ sá»Ÿ"]),
    tm_amount: parseAmount(getCellString(row, ["TM"])),
    nh_amount: parseAmount(getCellString(row, ["NH"])),
    vay_amount: parseAmount(getCellString(row, ["TVAY"])),
    total_amount: parseAmount(getCellString(row, ["Tong", "Tổng", "Tá»•ng"])),
    attribute_text: getCellString(row, [
      "Thuoc tinh",
      "Thuộc tính",
      "Thuá»™c tÃ­nh",
    ]),
    company_id: companyId,
    scenario: getCellString(row, [
      "Loai du lieu",
      "Loại dữ liệu",
      "Loáº¡i dá»¯ liá»‡u",
    ]),
    plan_id: planId,
    cost_center_id: costCenterId,
    source_row_no: index + 1,
  }));

const SUPPORTED_FACTS: Record<ImportTargetValue, SupportedFactConfig | null> = {
  hqkd: {
    tableName: "fact_hqkd",
    rowsBuilder: buildHQKDRows,
  },
  sd_tien: {
    tableName: "fact_su_dung_tien",
    rowsBuilder: buildSDTienRows,
  },
  thu_chi: {
    tableName: "fact_thu_chi",
    rowsBuilder: buildThuChiRows,
  },
  doanh_thu: null,
  phai_thu: null,
  phai_tra: null,
};

const insertInChunks = async (
  tableName: string,
  rows: Record<string, unknown>[],
  chunkSize = 500,
) => {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from(tableName).insert(chunk);
    if (error) {
      throw new Error(error.message);
    }
  }
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

  const resolvedPlanId = useMemo(() => {
    if (resolvedCCId) {
      const matchedCostCenter = scope.userCostCenters.find(
        (costCenter) =>
          String(costCenter.cost_center_id ?? costCenter.cost_center_code ?? "") ===
          resolvedCCId,
      );

      if (matchedCostCenter) return matchedCostCenter.plan_id;
    }

    return selectedPlanId !== ALL ? Number(selectedPlanId) : null;
  }, [resolvedCCId, scope.userCostCenters, selectedPlanId]);

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
    if (!activeImportTarget || !activeTarget?.supported) return;
    if (
      !loggedInUser ||
      !canCreate ||
      !resolvedCompanyId ||
      !resolvedCCId ||
      !resolvedPlanId
    ) {
      return;
    }
    if (validationStatus !== "valid" || !uploadFile || !allParsedRows.length) {
      return;
    }
    if (!headersAreExact()) return;

    const factConfig = SUPPORTED_FACTS[activeImportTarget];
    if (!factConfig) {
      toast({
        title: "Submit that bai",
        description: "Fact nay chua duoc noi vao schema moi.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    let createdBatchId: number | null = null;

    try {
      const { data: factMeta, error: factMetaError } = await supabase
        .from("fact_registry")
        .select("fact_id, table_name")
        .eq("table_name", factConfig.tableName)
        .eq("is_active", true)
        .single();

      if (factMetaError || !factMeta) {
        throw new Error(
          factMetaError?.message ?? "Khong tim thay metadata fact trong DB.",
        );
      }

      const batchPayload: UploadBatchInsert = {
        uploaded_by_user_id: loggedInUser.user_id,
        file_name: fileName,
        original_file_name: uploadFile.name,
        note: null,
        total_rows: allParsedRows.length,
        success_rows: 0,
        failed_rows: 0,
        status: "processing",
        submitted_at: new Date().toISOString(),
      };

      const { data: insertedBatch, error: batchError } = await supabase
        .from("upload_batches")
        .insert(batchPayload)
        .select("upload_batch_id")
        .single();

      if (batchError || !insertedBatch) {
        throw new Error(batchError?.message ?? "Khong the tao batch upload.");
      }

      const batchId = insertedBatch.upload_batch_id;
      createdBatchId = batchId;

      const factRows = factConfig.rowsBuilder({
        companyId: resolvedCompanyId,
        costCenterId: resolvedCCId,
        factId: (factMeta as FactRegistryRecord).fact_id,
        planId: resolvedPlanId,
        rows: allParsedRows,
        uploadBatchId: batchId,
        userName: loggedInUser.full_name,
      });

      await insertInChunks(factConfig.tableName, factRows);

      const batchFactPayload: UploadBatchFactInsert = {
        upload_batch_id: batchId,
        fact_id: (factMeta as FactRegistryRecord).fact_id,
        imported_rows: factRows.length,
        success_rows: factRows.length,
        failed_rows: 0,
        status: "completed",
      };

      const { error: batchFactError } = await supabase
        .from("upload_batch_facts")
        .insert(batchFactPayload);

      if (batchFactError) {
        throw new Error(batchFactError.message);
      }

      const { error: finalizeBatchError } = await supabase
        .from("upload_batches")
        .update({
          success_rows: factRows.length,
          failed_rows: 0,
          status: "completed",
        })
        .eq("upload_batch_id", batchId);

      if (finalizeBatchError) {
        throw new Error(finalizeBatchError.message);
      }

      handleClearFile();
      if (onSubmitted) {
        await onSubmitted();
      }
      toast({ title: "Submit thanh cong" });
    } catch (error) {
      if (createdBatchId !== null) {
        await supabase
          .from("upload_batches")
          .update({
            failed_rows: allParsedRows.length,
            status: "failed",
          })
          .eq("upload_batch_id", createdBatchId);
      }

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
    resolvedPlanId,
    toast,
    uploadFile,
    validationStatus,
  ]);

  const canSubmit =
    !!loggedInUser &&
    !!resolvedCompanyId &&
    !!resolvedCCId &&
    !!resolvedPlanId &&
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
