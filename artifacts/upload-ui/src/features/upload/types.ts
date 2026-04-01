import type {
  Company,
  CostCenter,
  Plan,
  UploadBatchStatus,
  UsersApp,
} from "@/types/supabase";
import type { FactConfig } from "@/data/factRegistry";

export interface RowData {
  [key: string]: string | number | null | undefined;
}

export type SheetCell = string | number | boolean | Date | null | undefined;
export type ValidationStatus = "idle" | "validating" | "valid" | "invalid";
export type ImportTargetValue = string;
export type BatchPreviewRow = Record<string, unknown>;

export interface BatchRecord {
  upload_batch_id: number;
  uploaded_by_user_id: string | null;
  uploaded_by_auth?: string | null;
  file_name: string;
  original_file_name: string;
  note: string | null;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  status: UploadBatchStatus;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface HeaderCandidate {
  rowIndex: number;
  headers: string[];
  renameNotes: string[];
  exactOrderMatches: number;
  requiredMatches: number;
  lengthDelta: number;
}

export interface FactDetectionResult {
  factConfig: FactConfig;
  headerCandidate: HeaderCandidate;
}

export interface FilterScope {
  loggedInUser: UsersApp | null;
  userCompanies: Company[];
  userPlans: Plan[];
  userCostCenters: CostCenter[];
}
<<<<<<< Updated upstream
=======

export const ROW_COLUMN_MAP: { db: keyof UploadRowInsert; label: string }[] = [
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
>>>>>>> Stashed changes
