export interface UsersApp {
  user_id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  cost_center_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AppUser = UsersApp;

export interface CostCenter {
  cost_center_code: string;
  cost_center_name: string;
  company_id: number;
  plan_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  company_id: number;
  company_name: string;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  plan_id: number;
  plan_name: string;
  parent_name: string | null;
  created_at: string;
  updated_at: string;
}

export type UploadBatchStatus = "draft" | "validated" | "submitted" | "failed";

export interface UploadBatchInsert {
  upload_date: string;
  accountant_name: string;
  company_id: number;
  cost_center_code: string;
  bp?: string | null;
  file_name: string;
  file_type?: string | null;
  preview_rows: number;
  status: UploadBatchStatus;
  uploaded_by: string;
  note?: string | null;
  total_rows: number;
}

export interface UploadRowInsert {
  batch_id: string;
  row_number: number;
  file_date?: string | null;
  system_code?: string | null;
  metric_group?: string | null;
  category_name?: string | null;
  subcategory_name?: string | null;
  amount?: number | null;
  attribute_name?: string | null;
  content_text?: string | null;
  company_name_in_file?: string | null;
  data_type?: string | null;
  block_name?: string | null;
  department_name?: string | null;
  raw_json?: Record<string, unknown> | null;
}
