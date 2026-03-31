import type { Company, CostCenter, Plan, UsersApp } from "@/types/supabase";

const FALLBACK_TIMESTAMP = "2026-01-01T00:00:00.000Z";

export const FALLBACK_COMPANIES: Company[] = [
  {
    company_id: 1,
    company_name: "Công ty Cổ phần Thịnh Cường",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    company_id: 2,
    company_name: "Công ty CP Công nghệ và dịch vụ Xanh Vĩnh Phúc",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    company_id: 3,
    company_name: "Công ty cổ phần An An’s Garden",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    company_id: 4,
    company_name: "Công ty Cổ phần Global AI",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    company_id: 5,
    company_name: "Xóa",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    company_id: 6,
    company_name: "Chi nhánh Vinfast - Công ty Thịnh Cường",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    company_id: 7,
    company_name: "Công ty Cổ phần Công Nghệ Vinfast Quảng Ninh",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    company_id: 20,
    company_name: "Thịnh Cường Group",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    company_id: 21,
    company_name: "Hợp tác xã",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    company_id: 22,
    company_name: "Công ty TNHH xuất nhập khẩu và khai thác Hưng Thịnh",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    company_id: 23,
    company_name: "Hợp tác xã vận tải Xanh Vĩnh Phúc",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    company_id: 24,
    company_name: "Hợp tác xã vận tải Xanh Tuyên Quang",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
];

export const FALLBACK_PLANS: Plan[] = [
  {
    plan_id: 1,
    plan_name: "Khối KD Công nghệ",
    parent_name: "Khối Kinh doanh",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    plan_id: 2,
    plan_name: "Khối KD DV Nhà hàng KS",
    parent_name: "Khối Kinh doanh",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    plan_id: 3,
    plan_name: "Khối KD Dự án",
    parent_name: "Khối Kinh doanh",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    plan_id: 4,
    plan_name: "Khối KD Trạm sạc Vgreen",
    parent_name: "Khối Kinh doanh",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    plan_id: 5,
    plan_name: "Khối KD Vinfast - XDV",
    parent_name: "Khối Kinh doanh",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    plan_id: 6,
    plan_name: "Khối KD Vận tải Taxi",
    parent_name: "Khối Kinh doanh",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    plan_id: 7,
    plan_name: "Khối KD Xe tải",
    parent_name: "Khối Kinh doanh",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    plan_id: 8,
    plan_name: "Khối KD xe điện Vinfast - SR",
    parent_name: "Khối Kinh doanh",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    plan_id: 9,
    plan_name: "Khối hỗ trợ tập đoàn",
    parent_name: "Khối Kinh doanh",
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
];

export const FALLBACK_COST_CENTERS: CostCenter[] = [
  {
    cost_center_code: "GA_ICT",
    cost_center_name: "ICT - GA",
    company_id: 4,
    plan_id: 1,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "ST_GD",
    cost_center_name: "Garden Sơn Tây",
    company_id: 3,
    plan_id: 2,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "CB_DA",
    cost_center_name: "Dự án Cao Bằng",
    company_id: 1,
    plan_id: 3,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "LS_DA",
    cost_center_name: "Dự án Lạng Sơn",
    company_id: 1,
    plan_id: 3,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "QS_DA",
    cost_center_name: "Dự án Quang Sơn",
    company_id: 1,
    plan_id: 3,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "YB_DA",
    cost_center_name: "Dự án Tân Thịnh",
    company_id: 1,
    plan_id: 3,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "TT_DA",
    cost_center_name: "Dự án Yên Bình",
    company_id: 1,
    plan_id: 3,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "TC_DA",
    cost_center_name: "Dự Án Thổ chu",
    company_id: 1,
    plan_id: 3,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "VG_TS",
    cost_center_name: "Trạm sạc - VG",
    company_id: 1,
    plan_id: 4,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "CP_XDV",
    cost_center_name: "Vinfast Cẩm Phả_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "HK_XDV",
    cost_center_name: "Vinfast Hà Khánh_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "HL_XDV",
    cost_center_name: "Vinfast Hạ Long_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "HCM_XDV",
    cost_center_name: "Vinfast Hồ Chí Minh_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "LB_XDV",
    cost_center_name: "Vinfast Long Biên_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "OCP_XDV",
    cost_center_name: "Vinfast Ocean Park_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "SMC_XDV",
    cost_center_name: "Vinfast Smart City_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "ST_XDV",
    cost_center_name: "Vinfast Sơn Tây_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "TQ_XDV",
    cost_center_name: "Vinfast Tuyên Quang_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "UB_XDV",
    cost_center_name: "Vinfast Uông Bí_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "VT_XDV",
    cost_center_name: "Vinfast Việt Trì_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "VP_XDV",
    cost_center_name: "Vinfast Vĩnh Phúc_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "XM_XDV",
    cost_center_name: "Vinfast Xuân Mai_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "ĐT_XDV",
    cost_center_name: "Vinfast Đài Tư_XDV",
    company_id: 1,
    plan_id: 5,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "PT_DP",
    cost_center_name: "Depot Phú Thọ",
    company_id: 2,
    plan_id: 6,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "ST_AT",
    cost_center_name: "Depot Sơn Tây",
    company_id: 3,
    plan_id: 6,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "TN_AT",
    cost_center_name: "Depot Thái Nguyên",
    company_id: 3,
    plan_id: 6,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "TQ_DP",
    cost_center_name: "Depot Tuyên Quang",
    company_id: 2,
    plan_id: 6,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "VP_DP",
    cost_center_name: "Depot Vĩnh Phúc",
    company_id: 2,
    plan_id: 6,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "TQ_HTX",
    cost_center_name: "HTX Tuyên Quang",
    company_id: 24,
    plan_id: 6,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "VP_HTX",
    cost_center_name: "HTX Vĩnh Phúc",
    company_id: 23,
    plan_id: 6,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "XT_O_TC",
    cost_center_name: "Xe tải Xăng/dầu - Thịnh Cường",
    company_id: 1,
    plan_id: 7,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "XT_O_HT",
    cost_center_name: "Xe tải Xăng/dầu - Hưng Thịnh",
    company_id: 22,
    plan_id: 7,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "XT_E_TC",
    cost_center_name: "Xe tải điện - Thịnh Cường",
    company_id: 1,
    plan_id: 7,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "XT_E_HT",
    cost_center_name: "Xe tải điện - Hưng Thịnh",
    company_id: 22,
    plan_id: 7,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "CP_SR_61",
    cost_center_name: "Vinfast Cẩm Phả_61",
    company_id: 2,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "CP_SR",
    cost_center_name: "Vinfast Cẩm Phả",
    company_id: 1,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "HL_SR",
    cost_center_name: "Vinfast Hạ Long",
    company_id: 1,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "HL_SR_61",
    cost_center_name: "Vinfast Hạ Long_61",
    company_id: 2,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "LB_SR_61",
    cost_center_name: "Vinfast Long Biên_61",
    company_id: 2,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "LB_SR",
    cost_center_name: "Vinfast Long Biên",
    company_id: 1,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "OCP_SR",
    cost_center_name: "Vinfast Ocean Park",
    company_id: 1,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "OCP_SR_61",
    cost_center_name: "Vinfast Ocean Park_61",
    company_id: 2,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "SMC_SR_61",
    cost_center_name: "Vinfast Smart City_61",
    company_id: 2,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "SMC_SR",
    cost_center_name: "Vinfast Smart City",
    company_id: 1,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "ST_SR",
    cost_center_name: "Vinfast Sơn Tây",
    company_id: 1,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "ST_SR_61",
    cost_center_name: "Vinfast Sơn Tây_61",
    company_id: 2,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "UB_SR",
    cost_center_name: "Vinfast Uông Bí",
    company_id: 7,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "VP_SR",
    cost_center_name: "Vinfast Vĩnh Phúc",
    company_id: 1,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "VP_SR_61",
    cost_center_name: "Vinfast Vĩnh Phúc_61",
    company_id: 2,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "XM_SR",
    cost_center_name: "Vinfast Xuân Mai",
    company_id: 1,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "XM_SR_61",
    cost_center_name: "Vinfast Xuân Mai_61",
    company_id: 2,
    plan_id: 8,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    cost_center_code: "HO_TC",
    cost_center_name: "HO Thịnh Cường",
    company_id: 1,
    plan_id: 9,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
];

export const FALLBACK_USERS_APP: UsersApp[] = [
  {
    user_id: "1234",
    auth_user_id: null,
    full_name: "Bùi Thị Ngọc",
    email: "1234@portup.local",
    cost_center_code: "HO_TC",
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    user_id: "3456",
    auth_user_id: null,
    full_name: "User 3456",
    email: "3456@portup.local",
    cost_center_code: null,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    user_id: "4567",
    auth_user_id: null,
    full_name: "User 4567",
    email: "4567@portup.local",
    cost_center_code: null,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    user_id: "5678",
    auth_user_id: null,
    full_name: "User 5678",
    email: "5678@portup.local",
    cost_center_code: null,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
  {
    user_id: "6789",
    auth_user_id: null,
    full_name: "User 6789",
    email: "6789@portup.local",
    cost_center_code: null,
    is_active: true,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  },
];

const FALLBACK_COMPANY_CODE_TO_ID: Record<string, number> = {
  TC: 1,
  XVP: 2,
  AAG: 3,
  GA: 4,
  HT: 22,
  HTX_XVP: 23,
  HTX_XTQ: 24,
};

const FALLBACK_COMPANY_NAME_ALIASES_BY_ID: Record<number, string[]> = {
  // Workbook-grounded company display form(s) that must map to fallback company 1.
  1: ["Công ty Cổ phần Thịnh Cường"],
};

const FALLBACK_COST_CENTER_NAME_ALIASES_BY_CODE: Record<string, string[]> = {
  // HQKD workbook display names observed in input.xlsx.
  HL_XDV: ["Vinfast Hạ Long (61)"],
  TN_AT: ["Depot Thái Nguyên"],
};

const normalizeToken = (value: string) => value.trim().toUpperCase();

export const getFallbackCompanyIdByCode = (code: string): number | null => {
  const resolved = FALLBACK_COMPANY_CODE_TO_ID[normalizeToken(code)];
  return typeof resolved === "number" ? resolved : null;
};

export const getFallbackCompanyAliases = (companyId: number): string[] => {
  return FALLBACK_COMPANY_NAME_ALIASES_BY_ID[companyId] ?? [];
};

export const getFallbackCostCenterAliases = (
  costCenterCode: string,
): string[] => {
  return (
    FALLBACK_COST_CENTER_NAME_ALIASES_BY_CODE[normalizeToken(costCenterCode)] ??
    []
  );
};

export const resolveFallbackPlanIds = (
  planTokens: string[],
  plans: Plan[] = FALLBACK_PLANS,
): number[] => {
  const normalized = planTokens
    .map(normalizeToken)
    .filter((token) => token.length > 0);

  if (normalized.length === 0) return [];

  const ids = new Set<number>();
  plans.forEach((plan) => {
    const planName = normalizeToken(plan.plan_name);
    if (
      normalized.some(
        (token) =>
          token === String(plan.plan_id) ||
          token === planName ||
          planName.includes(token),
      )
    ) {
      ids.add(plan.plan_id);
    }
  });
  return [...ids];
};

export interface FallbackUserMapping {
  user_id: string;
  companyCodes: string[];
  costCenterCodes: string[];
  planTokens: string[];
}

export const FALLBACK_USER_MAPPINGS: FallbackUserMapping[] = [
  {
    user_id: "1234",
    companyCodes: ["TC"],
    costCenterCodes: ["HL_XDV", "CP_XDV", "ST_XDV", "VP_XDV"],
    planTokens: ["XDV"],
  },
  {
    user_id: "3456",
    companyCodes: ["GA", "AAG"],
    costCenterCodes: ["GA_ICT", "ST_GD", "ST_AT", "TN_AT"],
    planTokens: ["Công nghệ", "DV Nhà hàng", "Vận tải Taxi"],
  },
  {
    user_id: "4567",
    companyCodes: ["TC", "HT"],
    costCenterCodes: ["XT_O_TC", "XT_E_TC", "XT_O_HT", "XT_E_HT"],
    planTokens: ["Xe tải"],
  },
  {
    user_id: "5678",
    companyCodes: ["TC", "XVP", "HTX_XVP", "HTX_XTQ"],
    costCenterCodes: ["VP_DP", "TQ_DP", "VP_HTX", "TQ_HTX"],
    planTokens: ["Vận tải Taxi"],
  },
  {
    user_id: "6789",
    companyCodes: ["TC", "XVP"],
    costCenterCodes: ["CP_SR", "HL_SR", "LB_SR", "OCP_SR", "SMC_SR"],
    planTokens: ["SR"],
  },
];

export interface FallbackUserFilePermission {
  user_id: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canApprove: boolean;
}

export const FALLBACK_USER_FILE_PERMISSIONS: FallbackUserFilePermission[] = [
  {
    user_id: "1234",
    canCreate: true,
    canRead: false,
    canUpdate: true,
    canApprove: false,
  },
  {
    user_id: "3456",
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canApprove: true,
  },
  {
    user_id: "4567",
    canCreate: true,
    canRead: false,
    canUpdate: true,
    canApprove: false,
  },
  {
    user_id: "5678",
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canApprove: true,
  },
  {
    user_id: "6789",
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canApprove: false,
  },
];
