import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Building2,
  Layers3,
  MapPin,
  CloudUpload,
  ClipboardList,
  Upload,
  ChevronDown,
  Users,
  History,
  Eye,
  FileCheck2,
  FileClock,
  FileX2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type {
  UsersApp,
  CostCenter,
  Company,
  Plan,
  UploadBatchInsert,
  UploadBatchStatus,
  UploadRowInsert,
} from "@/types/supabase";
import {
  ALL,
  FACT_REGISTRY,
  getFactConfig,
  type FactKey,
} from "@/data/factRegistry";
import {
  FALLBACK_COMPANIES,
  FALLBACK_COST_CENTERS,
  FALLBACK_PLANS,
  FALLBACK_USER_FILE_PERMISSIONS,
  FALLBACK_USER_MAPPINGS,
  FALLBACK_USERS_APP,
  getFallbackCompanyAliases,
  getFallbackCompanyIdByCode,
  getFallbackCostCenterAliases,
  resolveFallbackPlanIds,
} from "@/data/masterDataFallback";

interface RowData {
  [key: string]: string | number | null | undefined;
}

type SheetCell = string | number | boolean | Date | null | undefined;

type ValidationStatus = "idle" | "validating" | "valid" | "invalid";

interface BatchRecord {
  batch_id: string;
  upload_date: string;
  accountant_name: string;
  company_id: number;
  cost_center_code: string;
  bp: string | null;
  file_name: string;
  file_type: string | null;
  total_rows: number;
  preview_rows: number;
  status: UploadBatchStatus;
  uploaded_by: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

type BatchPreviewRow = Record<string, unknown>;

const ROW_COLUMN_MAP: { db: keyof UploadRowInsert; label: string }[] = [
  { db: "file_date", label: "Ngày" },
  { db: "system_code", label: "Mã hệ thống" },
  { db: "metric_group", label: "Nhóm chỉ tiêu" },
  { db: "category_name", label: "Khoản mục" },
  { db: "subcategory_name", label: "Tiểu mục" },
  { db: "attribute_name", label: "Thuộc tính" },
  { db: "content_text", label: "Nội dung" },
  { db: "company_name_in_file", label: "Công ty" },
  { db: "data_type", label: "Loại dữ liệu" },
  { db: "block_name", label: "Khối" },
  { db: "department_name", label: "Bộ phận" },
  { db: "amount", label: "Số tiền" },
];

type ImportTargetValue = FactKey;

const getLocalISODate = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const parseFileDate = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  const dmY = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmY) {
    const [, d, m, y] = dmY;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return text;
  const asDate = new Date(text);
  if (!Number.isNaN(asDate.getTime())) {
    const yyyy = asDate.getFullYear();
    const mm = String(asDate.getMonth() + 1).padStart(2, "0");
    const dd = String(asDate.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
};

const parseAmount = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = value.replace(/\s/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const normalizeHeaderLabel = (header: string) =>
  header.normalize("NFKC").replace(/\s+/g, " ").trim();

const normalizeLookupValue = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const isExplicitPlaceholderToken = (normalizedValue: string) => {
  // Workbook-observed junk placeholder: a stray backtick should be treated as no-value.
  return /^`+$/.test(normalizedValue);
};

const normalizeHeadersWithDuplicates = (sourceHeaders: string[]) => {
  const counts = new Map<string, number>();
  const renameNotes: string[] = [];
  const normalized = sourceHeaders.map((header, index) => {
    const base = normalizeHeaderLabel(header);
    const seen = counts.get(base) ?? 0;
    const next = seen + 1;
    counts.set(base, next);

    if (next === 1) return base;

    const renamed = `${base} (${next})`;
    renameNotes.push(
      `Cột trùng tên vị trí ${index + 1}: "${base}" được chuẩn hóa thành "${renamed}".`,
    );
    return renamed;
  });

  return { normalized, renameNotes };
};

const normalizeRowsByHeaders = (
  data: SheetCell[][],
  normalizedHeaders: string[],
) => {
  return data.map((row) => {
    return normalizedHeaders.reduce<RowData>((acc, header, idx) => {
      const value = row[idx];
      if (value === null || value === undefined || value === "") {
        acc[header] = null;
      } else if (typeof value === "number") {
        acc[header] = value;
      } else {
        acc[header] = String(value);
      }
      return acc;
    }, {});
  });
};

const trimTrailingEmptyCells = (row: SheetCell[]) => {
  const cells = row.map((cell) => String(cell ?? "").trim());
  let lastNonEmptyIdx = -1;
  for (let i = cells.length - 1; i >= 0; i -= 1) {
    if (cells[i] !== "") {
      lastNonEmptyIdx = i;
      break;
    }
  }
  return lastNonEmptyIdx >= 0 ? cells.slice(0, lastNonEmptyIdx + 1) : [];
};

const isEmptyMatrixRow = (row: SheetCell[]) =>
  row.every((cell) => String(cell ?? "").trim() === "");

interface HeaderCandidate {
  rowIndex: number;
  headers: string[];
  renameNotes: string[];
  exactOrderMatches: number;
  requiredMatches: number;
  lengthDelta: number;
}

const selectBestHeaderCandidate = (
  rows: SheetCell[][],
  requiredColumns: string[],
): HeaderCandidate | null => {
  let bestCandidate: HeaderCandidate | null = null;

  rows.forEach((row, rowIndex) => {
    const sourceHeaders = trimTrailingEmptyCells(row);
    if (!sourceHeaders.length) return;

    const { normalized: headers, renameNotes } =
      normalizeHeadersWithDuplicates(sourceHeaders);

    const exactOrderMatches = requiredColumns.reduce(
      (count, column, idx) => (headers[idx] === column ? count + 1 : count),
      0,
    );
    const requiredMatches = requiredColumns.filter((column) =>
      headers.includes(column),
    ).length;
    const lengthDelta = Math.abs(headers.length - requiredColumns.length);

    const candidate: HeaderCandidate = {
      rowIndex,
      headers,
      renameNotes,
      exactOrderMatches,
      requiredMatches,
      lengthDelta,
    };

    if (!bestCandidate) {
      bestCandidate = candidate;
      return;
    }

    if (candidate.exactOrderMatches > bestCandidate.exactOrderMatches) {
      bestCandidate = candidate;
      return;
    }
    if (candidate.exactOrderMatches < bestCandidate.exactOrderMatches) return;

    if (candidate.requiredMatches > bestCandidate.requiredMatches) {
      bestCandidate = candidate;
      return;
    }
    if (candidate.requiredMatches < bestCandidate.requiredMatches) return;

    if (candidate.lengthDelta < bestCandidate.lengthDelta) {
      bestCandidate = candidate;
      return;
    }
    if (candidate.lengthDelta > bestCandidate.lengthDelta) return;

    if (candidate.rowIndex < bestCandidate.rowIndex) {
      bestCandidate = candidate;
    }
  });

  return bestCandidate;
};

const mapRowToInsert = (
  row: RowData,
  fact: ImportTargetValue,
  batchId: string,
  rowNumber: number,
): UploadRowInsert => ({
  batch_id: batchId,
  row_number: rowNumber,
  file_date: parseFileDate(row["Ngày"]),
  system_code:
    fact === "hqkd" ? String(row["Mã hệ thống"] ?? "").trim() || null : null,
  metric_group: String(row["Nhóm chỉ tiêu"] ?? "").trim() || null,
  category_name:
    fact === "hqkd"
      ? String(row["Khoản mục"] ?? "").trim() || null
      : fact === "thu_chi"
        ? String(row["Danh mục"] ?? "").trim() || null
        : null,
  subcategory_name:
    fact === "hqkd" ? String(row["Tiểu mục"] ?? "").trim() || null : null,
  amount: parseAmount(row["Số tiền"]),
  attribute_name: String(row["Thuộc tính"] ?? "").trim() || null,
  content_text:
    fact === "hqkd" ? String(row["Nội dung"] ?? "").trim() || null : null,
  company_name_in_file:
    String(row["Công ty"] ?? row["Công ty (2)"] ?? "").trim() || null,
  data_type: String(row["Loại dữ liệu"] ?? "").trim() || null,
  block_name: String(row["Khối"] ?? row["Khối (2)"] ?? "").trim() || null,
  department_name: String(row["Bộ phận"] ?? "").trim() || null,
  raw_json: row,
});

export default function UploadPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeImportTarget, setActiveImportTarget] =
    useState<ImportTargetValue>(FACT_REGISTRY[0].value);

  const [allUsers, setAllUsers] = useState<UsersApp[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [allCostCenters, setAllCostCenters] = useState<CostCenter[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);
  const [masterDataNotice, setMasterDataNotice] = useState<string | null>(null);
  const [usersFallbackActive, setUsersFallbackActive] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoadingMaster(true);
      const [uRes, coRes, ccRes, pRes] = await Promise.all([
        supabase
          .from("users_app")
          .select(
            "user_id, auth_user_id, full_name, email, cost_center_code, is_active, created_at, updated_at",
          )
          .eq("is_active", true),
        supabase
          .from("companies")
          .select("company_id, company_name, created_at, updated_at"),
        supabase
          .from("cost_centers")
          .select(
            "cost_center_code, cost_center_name, company_id, plan_id, is_active, created_at, updated_at",
          )
          .eq("is_active", true),
        supabase
          .from("plans")
          .select("plan_id, plan_name, parent_name, created_at, updated_at"),
      ]);

      const liveUsers = (uRes.data as UsersApp[] | null) ?? [];
      const liveCompanies = (coRes.data as Company[] | null) ?? [];
      const liveCostCenters = (ccRes.data as CostCenter[] | null) ?? [];
      const livePlans = (pRes.data as Plan[] | null) ?? [];

      const useUsersFallback = liveUsers.length === 0;
      const useCompaniesFallback = liveCompanies.length === 0;
      const useCostCentersFallback = liveCostCenters.length === 0;
      const usePlansFallback = livePlans.length === 0;

      setAllUsers(useUsersFallback ? FALLBACK_USERS_APP : liveUsers);
      setUsersFallbackActive(useUsersFallback);
      setAllCompanies(
        useCompaniesFallback ? FALLBACK_COMPANIES : liveCompanies,
      );
      setAllCostCenters(
        useCostCentersFallback ? FALLBACK_COST_CENTERS : liveCostCenters,
      );
      setAllPlans(usePlansFallback ? FALLBACK_PLANS : livePlans);

      const fallbackDetails: string[] = [];
      if (useUsersFallback) fallbackDetails.push("users_app");
      if (useCompaniesFallback) fallbackDetails.push("companies");
      if (useCostCentersFallback) fallbackDetails.push("cost_centers");
      if (usePlansFallback) fallbackDetails.push("plans");

      setMasterDataNotice(
        fallbackDetails.length
          ? `Đang dùng dữ liệu fallback workbook cho: ${fallbackDetails.join(", ")}.`
          : null,
      );
      setIsLoadingMaster(false);
    };
    load();
  }, []);

  const [loggedInUser, setLoggedInUser] = useState<UsersApp | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginPopoverOpen, setLoginPopoverOpen] = useState(false);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(ALL);
  const [selectedCCId, setSelectedCCId] = useState<string>(ALL);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(ALL);

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

  const activeUserPermission = useMemo(
    () =>
      loggedInUser
        ? FALLBACK_USER_FILE_PERMISSIONS.find(
            (permission) => permission.user_id === loggedInUser.user_id,
          )
        : null,
    [loggedInUser],
  );

  const canCreate = !!loggedInUser && (activeUserPermission?.canCreate ?? true);
  const canRead = !!loggedInUser && (activeUserPermission?.canRead ?? true);

  const avatarColors = [
    "bg-violet-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
  ];

  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  const allowedCostCenters = useMemo(() => {
    if (!loggedInUser) return [] as CostCenter[];
    if (usersFallbackActive) {
      const mapping = FALLBACK_USER_MAPPINGS.find(
        (item) => item.user_id === loggedInUser.user_id,
      );
      if (!mapping) return [] as CostCenter[];

      const companyIds = new Set<number>(
        mapping.companyCodes
          .map((code) => getFallbackCompanyIdByCode(code))
          .filter((id): id is number => typeof id === "number"),
      );
      const planIds = new Set<number>(
        resolveFallbackPlanIds(mapping.planTokens),
      );
      const mappedCostCenters = new Set(
        mapping.costCenterCodes.map((code) => code.trim().toUpperCase()),
      );

      return allCostCenters.filter((cc) => {
        const ccCode = cc.cost_center_code.trim().toUpperCase();
        if (mappedCostCenters.has(ccCode)) return true;
        const companyMatched =
          companyIds.size > 0 && companyIds.has(cc.company_id);
        const planMatched = planIds.size > 0 && planIds.has(cc.plan_id);
        return companyMatched && planMatched;
      });
    }
    if (!loggedInUser.cost_center_code) return allCostCenters;
    return allCostCenters.filter(
      (cc) => cc.cost_center_code === loggedInUser.cost_center_code,
    );
  }, [loggedInUser, allCostCenters, usersFallbackActive]);

  const userCompanies = useMemo(() => {
    const ids = new Set(allowedCostCenters.map((cc) => cc.company_id));
    return allCompanies
      .filter((c) => ids.has(c.company_id))
      .sort((a, b) => a.company_id - b.company_id);
  }, [allowedCostCenters, allCompanies]);

  const userPlans = useMemo(() => {
    const ids = new Set(allowedCostCenters.map((cc) => cc.plan_id));
    return allPlans
      .filter((p) => ids.has(p.plan_id))
      .sort((a, b) => a.plan_id - b.plan_id);
  }, [allowedCostCenters, allPlans]);

  const userCostCenters = useMemo(() => {
    return allowedCostCenters
      .filter((cc) =>
        selectedCompanyId === ALL
          ? true
          : cc.company_id === Number(selectedCompanyId),
      )
      .filter((cc) =>
        selectedPlanId === ALL ? true : cc.plan_id === Number(selectedPlanId),
      )
      .sort((a, b) => a.cost_center_code.localeCompare(b.cost_center_code));
  }, [allowedCostCenters, selectedCompanyId, selectedPlanId]);

  const selectedPlan = userPlans.find(
    (p) => String(p.plan_id) === selectedPlanId,
  );

  const resolvedCompanyId =
    selectedCompanyId !== ALL
      ? Number(selectedCompanyId)
      : userCompanies.length === 1
        ? userCompanies[0].company_id
        : null;

  const resolvedCCId =
    selectedCCId !== ALL
      ? selectedCCId
      : userCostCenters.length === 1
        ? userCostCenters[0].cost_center_code
        : null;

  const handleLoginAs = (user: UsersApp) => {
    setLoginPopoverOpen(false);
    setIsLoggingIn(true);
    setLoggedInUser(user);
    setSelectedCompanyId(ALL);
    setSelectedCCId(ALL);
    setSelectedPlanId(ALL);
    setIsLoggingIn(false);
    toast({
      title: `Xin chào, ${user.full_name}!`,
      description: "Đã tải phạm vi đơn vị theo tài khoản.",
    });
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setSelectedCompanyId(ALL);
    setSelectedCCId(ALL);
    setSelectedPlanId(ALL);
  };

  const handleCompanyChange = (val: string) => {
    setSelectedCompanyId(val);
    setSelectedCCId(ALL);
    setSelectedPlanId(ALL);
  };

  const validateDataAgainstFilters = useCallback(
    (
      data: RowData[],
      companyId: string,
      ccId: string,
      planId: string,
      fact: ImportTargetValue,
    ): string[] => {
      if (!data.length || !loggedInUser) return [];

      const factConfig = getFactConfig(fact);

      const permittedCompanies =
        companyId === ALL
          ? userCompanies
          : userCompanies.filter((c) => String(c.company_id) === companyId);

      const permittedPlans =
        planId === ALL
          ? userPlans
          : userPlans.filter((p) => String(p.plan_id) === planId);

      const permittedCCs =
        ccId === ALL
          ? userCostCenters
          : userCostCenters.filter((cc) => cc.cost_center_code === ccId);

      const companyValidValues = new Set(
        permittedCompanies.flatMap((c) => [
          normalizeLookupValue(c.company_name),
          normalizeLookupValue(String(c.company_id)),
          ...getFallbackCompanyAliases(c.company_id).map(normalizeLookupValue),
        ]),
      );

      const planValidValues = new Set(
        permittedPlans.map((p) => normalizeLookupValue(p.plan_name)),
      );

      const ccValidValues = new Set(
        permittedCCs.flatMap((cc) => [
          normalizeLookupValue(cc.cost_center_name),
          normalizeLookupValue(cc.cost_center_code),
          ...getFallbackCostCenterAliases(cc.cost_center_code).map(
            normalizeLookupValue,
          ),
        ]),
      );

      const companyErrRows: number[] = [];
      const planErrRows: number[] = [];
      const ccErrRows: number[] = [];

      const companyColumns = factConfig.filterColumns.company;
      const planColumns = factConfig.filterColumns.plan;
      const ccColumns = factConfig.filterColumns.costCenter;

      const extractValue = (
        row: RowData,
        keys: string[],
        options?: { ignorePlaceholderBacktick?: boolean },
      ) => {
        for (const key of keys) {
          const value = normalizeLookupValue(String(row[key] ?? ""));
          if (
            options?.ignorePlaceholderBacktick &&
            isExplicitPlaceholderToken(value)
          ) {
            return "";
          }
          if (value) return value;
        }
        return "";
      };

      data.forEach((row, i) => {
        const rowNum = i + 2;
        const cty = extractValue(row, companyColumns, {
          ignorePlaceholderBacktick: true,
        });
        const khoi = extractValue(row, planColumns);
        const bp = extractValue(row, ccColumns);

        if (companyColumns.length && cty && !companyValidValues.has(cty)) {
          companyErrRows.push(rowNum);
        }
        if (planColumns.length && khoi && !planValidValues.has(khoi)) {
          planErrRows.push(rowNum);
        }
        if (ccColumns.length && bp && !ccValidValues.has(bp)) {
          ccErrRows.push(rowNum);
        }
      });

      const errs: string[] = [];
      if (companyErrRows.length) {
        errs.push(
          `Cột "Công ty": ${companyErrRows.length} dòng không hợp lệ. Cho phép: ${permittedCompanies
            .map((c) => c.company_name)
            .join(", ")}`,
        );
      }
      if (planErrRows.length) {
        errs.push(
          `Cột "Khối": ${planErrRows.length} dòng không hợp lệ. Cho phép: ${permittedPlans
            .map((p) => p.plan_name)
            .join(", ")}`,
        );
      }
      if (ccErrRows.length) {
        errs.push(
          `Cột "Bộ phận": ${ccErrRows.length} dòng không hợp lệ. Cho phép: ${permittedCCs
            .map((cc) => cc.cost_center_name)
            .join(", ")}`,
        );
      }

      return errs;
    },
    [loggedInUser, userCompanies, userPlans, userCostCenters],
  );

  useEffect(() => {
    if (
      !fileName ||
      validationStatus === "idle" ||
      validationStatus === "validating"
    )
      return;
    if (!allParsedRows.length) return;
    const errs = validateDataAgainstFilters(
      allParsedRows,
      selectedCompanyId,
      selectedCCId,
      selectedPlanId,
      activeImportTarget,
    );
    if (errs.length) {
      if (masterDataNotice) {
        setValidationWarnings(errs);
        setValidationErrors([]);
        setValidationStatus("valid");
      } else {
        setValidationWarnings([]);
        setValidationErrors(errs);
        setValidationStatus("invalid");
        setRows([]);
        setAllParsedRows([]);
        setHeaders([]);
        setTotalRows(0);
      }
    } else {
      setValidationWarnings([]);
      setValidationErrors([]);
      setValidationStatus("valid");
    }
  }, [
    selectedCompanyId,
    selectedCCId,
    selectedPlanId,
    fileName,
    validationStatus,
    allParsedRows,
    validateDataAgainstFilters,
    activeImportTarget,
    masterDataNotice,
  ]);

  const parseFile = useCallback(
    async (file: File) => {
      const factConfig = getFactConfig(activeImportTarget);
      if (!factConfig.supported) {
        setValidationStatus("invalid");
        setValidationErrors([
          factConfig.unsupportedReason ??
            "Fact chưa hỗ trợ do thiếu hợp đồng cột đã xác thực.",
        ]);
        setRows([]);
        setAllParsedRows([]);
        setHeaders([]);
        setUploadFile(null);
        setFileName("");
        setFileSize(0);
        setTotalRows(0);
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
        setValidationStatus("invalid");
        setValidationErrors(["Chỉ chấp nhận file CSV hoặc XLSX/XLS."]);
        setRows([]);
        setAllParsedRows([]);
        setHeaders([]);
        setFileName("");
        setFileSize(0);
        setUploadFile(null);
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
        const wb = XLSX.read(buffer, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const matrixData = XLSX.utils.sheet_to_json<SheetCell[]>(ws, {
          header: 1,
          raw: false,
          dateNF: "dd/mm/yyyy",
          blankrows: false,
          defval: "",
        });

        if (!matrixData.length) {
          setValidationStatus("invalid");
          setValidationErrors(["File không có dữ liệu."]);
          setRows([]);
          setAllParsedRows([]);
          setHeaders([]);
          return;
        }

        const headerCandidate = selectBestHeaderCandidate(
          matrixData,
          factConfig.requiredColumns,
        );
        if (!headerCandidate) {
          setValidationStatus("invalid");
          setValidationErrors([
            "Không tìm thấy dòng header hợp lệ theo fact đã chọn.",
          ]);
          setRows([]);
          setAllParsedRows([]);
          setHeaders([]);
          setTotalRows(0);
          return;
        }

        const fileHeaders = headerCandidate.headers;
        const renameNotes = headerCandidate.renameNotes;
        const structuralErrors: string[] = [];

        const missing = factConfig.requiredColumns.filter(
          (col) => !fileHeaders.includes(col),
        );
        if (missing.length) {
          structuralErrors.push(
            `Thiếu ${missing.length} cột: ${missing.join(", ")}`,
          );
        }

        if (!missing.length) {
          const orderErrors: string[] = [];
          factConfig.requiredColumns.forEach((col, expectedIdx) => {
            const actualIdx = fileHeaders.indexOf(col);
            if (actualIdx !== expectedIdx) {
              orderErrors.push(
                `"${col}" (vị trí ${actualIdx + 1}, cần ${expectedIdx + 1})`,
              );
            }
          });
          if (orderErrors.length) {
            structuralErrors.push(
              `Sai thứ tự ${orderErrors.length} cột: ${orderErrors.join("; ")}`,
            );
          }
        }

        const extra = fileHeaders.filter(
          (h) => !factConfig.requiredColumns.includes(h),
        );
        if (extra.length) {
          structuralErrors.push(
            `${extra.length} cột không nhận dạng: ${extra.join(", ")}`,
          );
        }

        if (structuralErrors.length) {
          setValidationStatus("invalid");
          setValidationWarnings([]);
          setValidationErrors(structuralErrors);
          setRows([]);
          setAllParsedRows([]);
          setHeaders([]);
          setTotalRows(0);
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
          activeImportTarget,
        );

        if (dataErrors.length) {
          if (masterDataNotice) {
            setValidationWarnings(dataErrors);
            setValidationErrors([]);
            toast({
              title: "File hợp lệ theo cột, có cảnh báo dữ liệu",
              description:
                "Đang dùng fallback master data nên vẫn cho preview để tiếp tục kiểm tra.",
            });
          } else {
            setValidationStatus("invalid");
            setValidationWarnings([]);
            setValidationErrors(dataErrors);
            setRows([]);
            setAllParsedRows([]);
            setHeaders([]);
            setTotalRows(0);
            toast({ title: "File có lỗi dữ liệu", variant: "destructive" });
            return;
          }
        }

        setTotalRows(normalizedRows.length);
        setHeaders(fileHeaders);
        setAllParsedRows(normalizedRows);
        setRows(normalizedRows.slice(0, 200));
        setValidationStatus("valid");
        setValidationErrors([]);
        if (renameNotes.length > 0) {
          toast({
            title: "Đã chuẩn hóa header trùng tên",
            description: renameNotes.join(" "),
          });
        }
        toast({
          title: "✓ File hợp lệ",
          description: `${normalizedRows.length.toLocaleString()} dòng dữ liệu (${factConfig.label}).`,
        });
      } catch {
        setValidationStatus("invalid");
        setValidationWarnings([]);
        setValidationErrors([
          "Không thể đọc file. Hãy kiểm tra lại định dạng file.",
        ]);
        setRows([]);
        setAllParsedRows([]);
        setHeaders([]);
        setUploadFile(null);
      }
    },
    [
      toast,
      validateDataAgainstFilters,
      selectedCompanyId,
      selectedCCId,
      selectedPlanId,
      activeImportTarget,
    ],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  const handleClearFile = () => {
    setUploadFile(null);
    setFileName("");
    setFileSize(0);
    setTotalRows(0);
    setRows([]);
    setAllParsedRows([]);
    setHeaders([]);
    setValidationStatus("idle");
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  const loadHistory = async () => {
    if (!loggedInUser) return;
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
      if (data) setHistoryBatches(data as BatchRecord[]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (historyOpen) loadHistory();
  }, [historyOpen]);

  const handleViewBatch = async (batch: BatchRecord) => {
    if (!uploadRowsPreviewAvailable) {
      toast({
        title: "Xem chi tiết tạm khóa",
        description:
          uploadRowsPreviewNotice ??
          "Bảng upload_rows chưa sẵn sàng nên không thể preview từng dòng.",
      });
      return;
    }

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
        const tableMissing =
          error.code === "PGRST205" ||
          error.message.toLowerCase().includes("upload_rows") ||
          error.message.toLowerCase().includes("does not exist");
        if (tableMissing) {
          setUploadRowsPreviewAvailable(false);
          setUploadRowsPreviewNotice(
            "Live DB chưa có bảng upload_rows. Tạm tắt preview chi tiết lịch sử.",
          );
          setPreviewBatch(null);
          setBatchRows([]);
          return;
        }
        throw new Error(error.message);
      }
      setBatchRows((data ?? []) as BatchPreviewRow[]);
    } catch (err) {
      toast({
        title: "Không thể tải dữ liệu",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
        variant: "destructive",
      });
    } finally {
      setBatchRowsLoading(false);
    }
  };

  const headersAreExact = () => {
    const required = activeTarget.requiredColumns;
    if (!required.length) return false;
    if (headers.length !== required.length) return false;
    return required.every((h, i) => headers[i] === h);
  };

  const handleSubmit = async () => {
    if (!activeTarget.supported) {
      toast({
        title: "Fact chưa hỗ trợ submit",
        description:
          activeTarget.unsupportedReason ??
          "Fact này chưa có hợp đồng cột xác thực nên đang tạm khóa.",
        variant: "destructive",
      });
      return;
    }
    if (!loggedInUser) {
      toast({ title: "Vui lòng đăng nhập trước.", variant: "destructive" });
      return;
    }
    if (!canCreate) {
      toast({ title: "Bạn không có quyền upload.", variant: "destructive" });
      return;
    }
    if (!resolvedCompanyId) {
      toast({
        title: "Vui lòng chọn Công ty cụ thể trước khi submit.",
        variant: "destructive",
      });
      return;
    }
    if (!resolvedCCId) {
      toast({
        title: "Vui lòng chọn Cost Center cụ thể trước khi submit.",
        variant: "destructive",
      });
      return;
    }
    if (validationStatus !== "valid" || !uploadFile || !allParsedRows.length) {
      toast({ title: "Vui lòng upload file hợp lệ.", variant: "destructive" });
      return;
    }
    if (!headersAreExact()) {
      toast({
        title: "Header file không hợp lệ",
        description: "Vui lòng giữ đúng thứ tự và tên cột theo mẫu.",
        variant: "destructive",
      });
      return;
    }

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

      if (duplicateError) throw new Error(duplicateError.message);
      if (duplicateRows && duplicateRows.length > 0) {
        throw new Error(
          "Bạn đã có 1 batch trong ngày cho cùng công ty và cost center. Vui lòng kiểm tra lịch sử.",
        );
      }

      const ext = fileName.split(".").pop()?.toLowerCase() ?? null;
      const batch: UploadBatchInsert = {
        upload_date: uploadDate,
        accountant_name: loggedInUser.full_name,
        company_id: resolvedCompanyId,
        cost_center_code: resolvedCCId,
        bp: selectedPlan?.plan_name ?? null,
        file_name: fileName,
        file_type: ext,
        total_rows: allParsedRows.length,
        preview_rows: Math.min(allParsedRows.length, 200),
        status: "submitted",
        uploaded_by: loggedInUser.user_id,
        note: null,
      };

      const { data: insertedBatch, error: batchError } = await supabase
        .from("upload_batches")
        .insert(batch)
        .select("batch_id")
        .single();

      if (batchError || !insertedBatch) {
        throw new Error(batchError?.message ?? "Không thể tạo batch upload.");
      }

      const rowPayload = allParsedRows.map((r, idx) =>
        mapRowToInsert(r, activeImportTarget, insertedBatch.batch_id, idx + 1),
      );

      const chunkSize = 500;
      for (let i = 0; i < rowPayload.length; i += chunkSize) {
        const chunk = rowPayload.slice(i, i + chunkSize);
        const { error: rowError } = await supabase
          .from("upload_rows")
          .insert(chunk);
        if (rowError) {
          const tableMissing =
            rowError.code === "PGRST205" ||
            rowError.message.toLowerCase().includes("upload_rows") ||
            rowError.message.toLowerCase().includes("does not exist");
          if (tableMissing) {
            setUploadRowsPreviewAvailable(false);
            setUploadRowsPreviewNotice(
              "Live DB chưa có bảng upload_rows. Batch vẫn tạo được nhưng chưa thể lưu/preview từng dòng.",
            );
            break;
          }
          throw new Error(rowError.message);
        }
      }

      toast({
        title: "Submit thành công!",
        description: `${allParsedRows.length.toLocaleString()} dòng đã được lưu vào batch mới.`,
      });

      handleClearFile();
      if (historyOpen) await loadHistory();
    } catch (err) {
      toast({
        title: "Submit thất bại",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTarget = getFactConfig(activeImportTarget);
  const canSubmit =
    !!loggedInUser &&
    !!resolvedCompanyId &&
    !!resolvedCCId &&
    activeTarget.supported &&
    validationStatus === "valid" &&
    !!uploadFile &&
    allParsedRows.length > 0 &&
    !isSubmitting;

  const notLoggedIn = !loggedInUser;
  const filtersReady = !!resolvedCompanyId && !!resolvedCCId;
  const previewReady = rows.length > 0;
  const uploadStateLabel =
    validationStatus === "valid"
      ? "Hợp lệ"
      : validationStatus === "invalid"
        ? "Có lỗi"
        : validationStatus === "validating"
          ? "Đang kiểm tra"
          : "Chưa có file";

  const flowSteps = [
    {
      label: "Fact",
      description: `${activeTarget.label} · ${activeTarget.group}`,
      ready: true,
      accent: "text-primary",
    },
    {
      label: "Tài khoản",
      description: loggedInUser
        ? loggedInUser.full_name
        : "Đăng nhập để nhận phạm vi",
      ready: !!loggedInUser,
      accent: !!loggedInUser ? "text-emerald-700" : "text-muted-foreground",
    },
    {
      label: "Bộ lọc đơn vị",
      description: filtersReady
        ? `${resolvedCompanyId} · ${resolvedCCId}`
        : "Chọn cụ thể Công ty và Cost Center",
      ready: filtersReady,
      accent: filtersReady ? "text-emerald-700" : "text-muted-foreground",
    },
    {
      label: "Upload file",
      description: fileName
        ? `${fileName} · ${uploadStateLabel}`
        : "Chưa chọn file nguồn",
      ready: validationStatus === "valid",
      accent:
        validationStatus === "invalid"
          ? "text-red-700"
          : validationStatus === "valid"
            ? "text-emerald-700"
            : "text-muted-foreground",
    },
    {
      label: "Preview & submit",
      description: previewReady
        ? `${rows.length.toLocaleString()} / ${totalRows.toLocaleString()} dòng sẵn sàng`
        : "Kiểm tra dữ liệu trước khi gửi",
      ready: previewReady && validationStatus === "valid",
      accent: previewReady ? "text-emerald-700" : "text-muted-foreground",
    },
  ];

  const completedFlowSteps = flowSteps.filter((step) => step.ready).length;
  const progressValue = (completedFlowSteps / flowSteps.length) * 100;

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <header className="bg-white border-b border-border/60 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-sm text-foreground">
                Kế Toán Upload
              </span>
              <span className="hidden sm:inline text-muted-foreground text-xs ml-2">
                / Nhập liệu dữ liệu tài chính
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoadingMaster && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="hidden sm:inline">Đang tải...</span>
              </span>
            )}

            {loggedInUser && canRead && (
              <button
                onClick={() => setHistoryOpen(true)}
                className="flex items-center gap-1.5 border border-border/60 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                title="Lịch sử file của tôi"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lịch sử</span>
              </button>
            )}

            {loggedInUser ? (
              <Popover
                open={loginPopoverOpen}
                onOpenChange={setLoginPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full pl-2 pr-3 py-1.5 hover:bg-primary/12 transition-colors">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold",
                        avatarColors[
                          allUsers.findIndex(
                            (u) => u.user_id === loggedInUser.user_id,
                          ) % avatarColors.length
                        ],
                      )}
                    >
                      {getInitials(loggedInUser.full_name)}
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      {loggedInUser.full_name}
                    </span>
                    <ChevronDown className="w-3 h-3 text-primary/60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-72 p-2 rounded-2xl shadow-lg"
                >
                  <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wide">
                    Chuyển tài khoản
                  </p>
                  <div className="space-y-0.5">
                    {allUsers
                      .filter((u) => u.is_active)
                      .map((u, i) => {
                        const isActive = loggedInUser.user_id === u.user_id;
                        return (
                          <button
                            key={u.user_id}
                            onClick={() => handleLoginAs(u)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                              isActive ? "bg-primary/10" : "hover:bg-muted",
                            )}
                          >
                            <div
                              className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0",
                                avatarColors[i % avatarColors.length],
                              )}
                            >
                              {getInitials(u.full_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-xs font-semibold truncate",
                                  isActive ? "text-primary" : "text-foreground",
                                )}
                              >
                                {u.full_name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {u.email}
                              </p>
                            </div>
                            {isActive && (
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                  <div className="border-t border-border/50 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Popover
                open={loginPopoverOpen}
                onOpenChange={setLoginPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    disabled={isLoggingIn || isLoadingMaster}
                    className="h-8 gap-2 rounded-full px-4 shadow-sm"
                  >
                    {isLoggingIn ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogIn className="w-3.5 h-3.5" />
                    )}
                    {isLoggingIn ? "Đang xử lý..." : "Đăng nhập"}
                    {!isLoggingIn && (
                      <ChevronDown className="w-3 h-3 opacity-70" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-72 p-2 rounded-2xl shadow-lg"
                >
                  <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Chọn tài khoản
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    {allUsers.filter((u) => u.is_active).length === 0 && (
                      <p className="px-3 py-2 text-[11px] text-muted-foreground">
                        Không có dữ liệu users_app để đăng nhập.
                      </p>
                    )}
                    {allUsers
                      .filter((u) => u.is_active)
                      .map((u, i) => (
                        <button
                          key={u.user_id}
                          onClick={() => handleLoginAs(u)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-muted transition-colors group"
                        >
                          <div
                            className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0",
                              avatarColors[i % avatarColors.length],
                            )}
                          >
                            {getInitials(u.full_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {u.full_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {u.email}
                            </p>
                          </div>
                          <LogIn className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-border/60 bg-white shadow-sm overflow-hidden">
            <div className="px-5 sm:px-6 py-5 sm:py-6 space-y-5">
              {masterDataNotice && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-[11px] text-amber-700">
                  {masterDataNotice}
                </div>
              )}

              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3 max-w-2xl">
                  <div className="space-y-1.5">
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                      Chọn fact rồi tiếp tục flow upload như hiện tại
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Danh sách fact được gom vào một dropdown duy nhất để màn
                      hình gọn hơn và dễ chọn hơn. Sau khi chọn fact, bạn vẫn
                      đăng nhập, lọc đơn vị, upload file, xem preview và submit
                      như trước.
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:w-[420px]">
                  <div className="rounded-2xl border border-border/60 bg-[#f8f9fc] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Fact
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground line-clamp-1">
                      {activeTarget.label}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-[#f8f9fc] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Tài khoản
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground line-clamp-1">
                      {loggedInUser?.full_name ?? "Chưa đăng nhập"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-[#f8f9fc] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Bộ lọc
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground line-clamp-1">
                      {filtersReady
                        ? `${resolvedCompanyId} · ${resolvedCCId}`
                        : "Chọn Công ty + Cost Center"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-[#f8f9fc] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Upload
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground line-clamp-1">
                      {uploadStateLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
                <div className="rounded-2xl border border-border/60 bg-[#f8f9fc] p-4">
                  <Label className="text-[11px] font-semibold text-foreground">
                    Fact cần upload
                  </Label>
                  <Select
                    value={activeImportTarget}
                    onValueChange={(value) =>
                      setActiveImportTarget(value as ImportTargetValue)
                    }
                  >
                    <SelectTrigger className="mt-2 h-11 rounded-2xl border-border/70 bg-white text-sm">
                      <SelectValue placeholder="Chọn fact" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {FACT_REGISTRY.map((target) => (
                        <SelectItem key={target.value} value={target.value}>
                          {target.label} · {target.group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {activeTarget.description}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-[#f8f9fc] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Nhóm dữ liệu
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">
                    {activeTarget.group}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Chọn một fact cho mỗi lần upload.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-[#f8f9fc] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Mẫu cột
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">
                    {activeTarget.supported
                      ? `${activeTarget.requiredColumns.length} cột bắt buộc`
                      : "Tạm khóa"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {activeTarget.supported
                      ? "Giữ đúng tên cột và thứ tự theo workbook mẫu."
                      : activeTarget.unsupportedReason}
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] border border-border/50 bg-[#f8f9fc] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Tiến độ import
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {completedFlowSteps}/{flowSteps.length} bước đã sẵn sàng
                      cho fact đang chọn.
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-white px-3 py-1 text-[11px] font-semibold text-foreground">
                    {Math.round(progressValue)}%
                  </span>
                </div>
                <Progress value={progressValue} className="h-2 bg-[#e5ebf5]" />
                <div className="grid gap-2 lg:grid-cols-5">
                  {flowSteps.map((step, index) => (
                    <div
                      key={step.label}
                      className={cn(
                        "rounded-2xl border px-3.5 py-3 transition-colors",
                        step.ready
                          ? "border-emerald-200 bg-white"
                          : "border-border/60 bg-white/70",
                        step.label === "Upload file" &&
                          validationStatus === "invalid" &&
                          "border-red-200 bg-red-50/70",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Bước {index + 1}
                        </span>
                        {step.ready ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : step.label === "Upload file" &&
                          validationStatus === "invalid" ? (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-border shrink-0" />
                        )}
                      </div>
                      <p className="mt-2 text-xs font-semibold text-foreground">
                        {step.label}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-[11px] leading-snug",
                          step.accent,
                        )}
                      >
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_340px] items-stretch">
            <div className="bg-white border border-border/60 rounded-[28px] shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-border/40 flex flex-wrap items-center gap-2">
                <Layers3 className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-xs font-semibold text-foreground">
                  Phân loại đơn vị
                </h2>
                <span className="inline-flex items-center rounded-full border border-border/60 bg-[#f8f9fc] px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  Fact: {activeTarget.label}
                </span>
                {loggedInUser && (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {userCostCenters.length} CC khả dụng
                  </span>
                )}
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                      <Building2 className="w-3 h-3 text-primary" /> Công ty
                    </Label>
                    <Select
                      value={selectedCompanyId}
                      onValueChange={handleCompanyChange}
                      disabled={notLoggedIn || isLoggingIn}
                    >
                      <SelectTrigger className="h-10 rounded-2xl border-border/70 text-xs bg-[#f8f9fc]">
                        <SelectValue placeholder="Đăng nhập trước..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value={ALL}>
                          <span className="text-muted-foreground font-medium">
                            Tất cả ({userCompanies.length})
                          </span>
                        </SelectItem>
                        {userCompanies.map((c) => (
                          <SelectItem
                            key={c.company_id}
                            value={String(c.company_id)}
                          >
                            <span className="font-mono text-primary text-[10px] mr-1">
                              [{c.company_id}]
                            </span>
                            {c.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                      <MapPin className="w-3 h-3 text-primary" /> Cost Center
                    </Label>
                    <Select
                      value={selectedCCId}
                      onValueChange={setSelectedCCId}
                      disabled={notLoggedIn || isLoggingIn}
                    >
                      <SelectTrigger className="h-10 rounded-2xl border-border/70 text-xs bg-[#f8f9fc]">
                        <SelectValue placeholder="Đăng nhập trước..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value={ALL}>
                          <span className="text-muted-foreground font-medium">
                            Tất cả ({userCostCenters.length})
                          </span>
                        </SelectItem>
                        {userCostCenters.map((cc) => (
                          <SelectItem
                            key={cc.cost_center_code}
                            value={cc.cost_center_code}
                          >
                            <span className="font-mono text-primary text-[10px] mr-1">
                              [{cc.cost_center_code}]
                            </span>
                            {cc.cost_center_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                      <Layers3 className="w-3 h-3 text-primary" /> Khối kinh
                      doanh
                    </Label>
                    <Select
                      value={selectedPlanId}
                      onValueChange={setSelectedPlanId}
                      disabled={notLoggedIn || isLoggingIn}
                    >
                      <SelectTrigger className="h-10 rounded-2xl border-border/70 text-xs bg-[#f8f9fc]">
                        <SelectValue placeholder="Đăng nhập trước..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value={ALL}>
                          <span className="text-muted-foreground font-medium">
                            Tất cả ({userPlans.length})
                          </span>
                        </SelectItem>
                        {userPlans.map((p) => (
                          <SelectItem key={p.plan_id} value={String(p.plan_id)}>
                            {p.plan_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {loggedInUser &&
                  (selectedCompanyId === ALL || selectedCCId === ALL) && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Cần chọn cụ thể Công ty và Cost Center để submit.
                    </p>
                  )}
              </div>
            </div>

            <div className="bg-white border border-border/60 rounded-[28px] shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 pt-4 pb-3 border-b border-border/40 flex flex-wrap items-center gap-2">
                <CloudUpload className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-xs font-semibold text-foreground">
                  Upload file
                </h2>
                <span className="inline-flex items-center rounded-full border border-border/60 bg-[#f8f9fc] px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  {activeTarget.label}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  CSV · XLSX
                </span>
              </div>
              <div className="p-4 flex flex-col gap-3 flex-1">
                {!activeTarget.supported && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-700">
                    {activeTarget.unsupportedReason}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {!fileName ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    className={cn(
                      "border-2 border-dashed rounded-[22px] flex flex-col items-center gap-2 py-8 cursor-pointer transition-all duration-200 bg-[#fbfcfe]",
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-white",
                    )}
                  >
                    <div
                      className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center",
                        isDragging ? "bg-primary/15" : "bg-muted",
                      )}
                    >
                      <CloudUpload
                        className={cn(
                          "w-5 h-5",
                          isDragging ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-foreground">
                        Kéo thả file vào đây
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        hoặc chọn file
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "rounded-[22px] border p-3.5 flex items-start gap-3",
                      validationStatus === "valid"
                        ? "border-emerald-200 bg-emerald-50/60"
                        : validationStatus === "invalid"
                          ? "border-red-200 bg-red-50/60"
                          : "border-border bg-muted/30",
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        validationStatus === "valid"
                          ? "bg-emerald-100"
                          : validationStatus === "invalid"
                            ? "bg-red-100"
                            : "bg-muted",
                      )}
                    >
                      {validationStatus === "validating" ? (
                        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                      ) : validationStatus === "valid" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : validationStatus === "invalid" ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate">
                        {fileName}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {(fileSize / 1024).toFixed(1)} KB
                      </p>
                      {validationStatus === "valid" && (
                        <p className="text-[10px] text-emerald-600 font-medium mt-1">
                          {totalRows.toLocaleString()} dòng · Hợp lệ
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleClearFile}
                      className="text-muted-foreground hover:text-foreground text-[10px] shrink-0 mt-0.5"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!activeTarget.supported}
                  className="gap-1.5 rounded-2xl h-9 border-border/70 text-xs w-full"
                >
                  <Upload className="w-3 h-3" />
                  {fileName ? "Thay file khác" : "Chọn file"}
                </Button>

                <div className="flex-1" />

                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  size="sm"
                  className="gap-1.5 rounded-2xl h-10 w-full shadow-sm font-semibold text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <ClipboardList className="w-3.5 h-3.5" />
                      Gửi dữ liệu
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-[28px] overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-red-200 flex flex-wrap items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-xs font-semibold text-red-700">
                  Phát hiện {validationErrors.length} lỗi trong file
                </span>
              </div>
              <ul className="px-5 py-3 space-y-2">
                {validationErrors.map((err, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-200 text-red-700 text-[9px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[11px] text-red-700 leading-snug">
                      {err}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validationWarnings.length > 0 && validationErrors.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-[28px] overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-amber-200 flex flex-wrap items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-amber-700">
                  Có {validationWarnings.length} cảnh báo dữ liệu khi đối chiếu
                  fallback master data
                </span>
              </div>
              <ul className="px-5 py-3 space-y-2">
                {validationWarnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-200 text-amber-700 text-[9px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[11px] text-amber-700 leading-snug">
                      {warning}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white border border-border/60 rounded-[28px] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <ClipboardList className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">
                    Dữ liệu Preview
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Preview hiển thị tối đa 200 dòng trước khi submit.
                  </p>
                </div>
              </div>
              {rows.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary font-semibold px-3 py-1 rounded-full">
                  {rows.length.toLocaleString()} / {totalRows.toLocaleString()}{" "}
                  dòng
                </span>
              )}
            </div>
            {rows.length > 0 ? (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="bg-[#f4f6fb] hover:bg-[#f4f6fb] border-b border-border/50">
                      <TableHead className="text-[10px] font-bold text-muted-foreground w-10 px-3 py-2.5 text-center">
                        #
                      </TableHead>
                      {headers.map((col) => (
                        <TableHead
                          key={col}
                          className="text-[10px] font-bold text-foreground whitespace-nowrap px-3 py-2.5 border-l border-border/30 first:border-l-0"
                        >
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow
                        key={idx}
                        className={cn(
                          "border-b border-border/30 hover:bg-primary/3 transition-colors",
                          idx % 2 === 0 ? "bg-white" : "bg-[#fafbfd]",
                        )}
                      >
                        <TableCell className="text-[10px] text-muted-foreground text-center px-3 py-1.5 font-mono">
                          {idx + 1}
                        </TableCell>
                        {headers.map((col) => (
                          <TableCell
                            key={col}
                            className="text-xs px-3 py-1.5 whitespace-nowrap border-l border-border/20 first:border-l-0 font-mono text-[11px]"
                          >
                            {row[col] !== undefined && row[col] !== null ? (
                              String(row[col])
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                  <FileSpreadsheet className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Chưa có dữ liệu preview
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog
        open={!!previewBatch}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewBatch(null);
            setBatchRows([]);
          }
        }}
      >
        <DialogContent className="max-w-5xl w-full max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b border-border/40 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              {previewBatch?.file_name}
              <span className="text-muted-foreground font-normal text-xs">
                #{previewBatch?.batch_id.slice(0, 8)} ·{" "}
                {previewBatch?.total_rows?.toLocaleString()} dòng
              </span>
            </DialogTitle>
          </DialogHeader>
          {batchRowsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <span className="ml-3 text-sm text-muted-foreground">
                Đang tải dữ liệu...
              </span>
            </div>
          ) : batchRows.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <FileSpreadsheet className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Không có dữ liệu để hiển thị
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
                  {batchRows.map((row, idx) => (
                    <TableRow
                      key={idx}
                      className={cn(
                        "border-b border-border/30 hover:bg-primary/3",
                        idx % 2 === 0 ? "bg-white" : "bg-[#fafbfd]",
                      )}
                    >
                      <TableCell className="text-[10px] text-muted-foreground text-center px-3 py-1.5 font-mono">
                        {idx + 1}
                      </TableCell>
                      {ROW_COLUMN_MAP.map(({ db }) => (
                        <TableCell
                          key={db}
                          className="text-[11px] px-3 py-1.5 whitespace-nowrap border-l border-border/20 font-mono"
                        >
                          {row[db] !== null && row[db] !== undefined ? (
                            String(row[db])
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
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

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          className="w-full sm:w-[520px] sm:max-w-[520px] p-0 flex flex-col"
          side="right"
        >
          <SheetHeader className="px-6 py-4 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4 text-primary" />
                Lịch sử File Upload
              </SheetTitle>
              <button
                onClick={loadHistory}
                disabled={historyLoading}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                title="Làm mới"
              >
                <RefreshCw
                  className={cn(
                    "w-3.5 h-3.5",
                    historyLoading && "animate-spin",
                  )}
                />
              </button>
            </div>
            {loggedInUser && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {loggedInUser.full_name}
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
                  Chưa có file nào được upload
                </p>
              </div>
            ) : (
              <div className="space-y-2 pb-6">
                {historyBatches.map((batch) => (
                  <HistoryBatchCard
                    key={batch.batch_id}
                    batch={batch}
                    companyName={
                      allCompanies.find(
                        (c) => c.company_id === batch.company_id,
                      )?.company_name ?? String(batch.company_id)
                    }
                    canRead={canRead && uploadRowsPreviewAvailable}
                    onViewBatch={handleViewBatch}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function HistoryBatchCard({
  batch,
  companyName,
  canRead,
  onViewBatch,
}: {
  batch: BatchRecord;
  companyName: string;
  canRead: boolean;
  onViewBatch: (batch: BatchRecord) => void;
}) {
  const statusConfig: Record<
    UploadBatchStatus,
    { label: string; icon: typeof FileClock; className: string }
  > = {
    draft: {
      label: "Nháp",
      icon: FileClock,
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    validated: {
      label: "Đã kiểm tra",
      icon: FileCheck2,
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    submitted: {
      label: "Đã gửi",
      icon: FileCheck2,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    failed: {
      label: "Lỗi",
      icon: FileX2,
      className: "bg-red-50 text-red-700 border-red-200",
    },
  };

  const cfg = statusConfig[batch.status] ?? statusConfig.draft;
  const StatusIcon = cfg.icon;
  const date = new Date(batch.created_at).toLocaleString("vi-VN", {
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
                cfg.className,
              )}
            >
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground">
              #{batch.batch_id.slice(0, 8)}
            </span>
            <span className="text-[10px] text-muted-foreground">{date}</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {batch.total_rows.toLocaleString()} dòng
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
