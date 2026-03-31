export const ALL = "__all__";

export const FACT_KEYS = [
  "hqkd",
  "sd_tien",
  "thu_chi",
  "doanh_thu",
  "phai_thu",
  "phai_tra",
] as const;

export type FactKey = (typeof FACT_KEYS)[number];

export interface FactConfig {
  value: FactKey;
  label: string;
  group: string;
  description: string;
  requiredColumns: string[];
  supported: boolean;
  unsupportedReason?: string;
  filterColumns: {
    company: string[];
    plan: string[];
    costCenter: string[];
  };
}

export const FACT_REGISTRY: FactConfig[] = [
  {
    value: "hqkd",
    label: "HQKD",
    group: "Hiệu quả kinh doanh",
    description: "Hỗ trợ upload đầy đủ với hợp đồng cột cố định theo mẫu HQKD.",
    requiredColumns: [
      "Ngày",
      "Mã hệ thống",
      "Nhóm chỉ tiêu",
      "Khoản mục",
      "Tiểu mục",
      "Thuộc tính",
      "Nội dung",
      "Công ty",
      "Loại dữ liệu",
      "Khối",
      "Bộ phận",
      "Số tiền",
    ],
    supported: true,
    filterColumns: {
      company: ["Công ty"],
      plan: ["Khối"],
      costCenter: ["Bộ phận"],
    },
  },
  {
    value: "sd_tien",
    label: "SD tiền",
    group: "Dòng tiền",
    description:
      "Hỗ trợ upload với kiểm tra cột SD tiền. Cột trùng tên được chuẩn hóa thành nhãn (2).",
    requiredColumns: [
      "Ngày",
      "Nhóm chỉ tiêu",
      "Loại tiền",
      "Công ty",
      "Ngân hàng",
      "Thuộc tính",
      "Công ty (2)",
      "Loại dữ liệu",
      "Khối",
      "Bộ phận",
      "Số tiền",
      "Chênh lệch",
    ],
    supported: true,
    filterColumns: {
      company: ["Công ty", "Công ty (2)"],
      plan: ["Khối"],
      costCenter: ["Bộ phận"],
    },
  },
  {
    value: "thu_chi",
    label: "Thu chi",
    group: "Thu chi vận hành",
    description:
      "Hỗ trợ upload với kiểm tra cột Thu chi. Cột trùng tên được chuẩn hóa thành nhãn (2).",
    requiredColumns: [
      "Ngày",
      "Nhóm chỉ tiêu",
      "Danh mục",
      "Nguồn",
      "Khối",
      "Cơ sở",
      "TM",
      "NH",
      "TVAY",
      "Tổng",
      "Thuộc tính",
      "Công ty",
      "Loại dữ liệu",
      "Khối (2)",
      "Bộ phận",
    ],
    supported: true,
    filterColumns: {
      company: ["Công ty"],
      plan: ["Khối (2)", "Khối"],
      costCenter: ["Bộ phận"],
    },
  },
  {
    value: "doanh_thu",
    label: "Doanh thu",
    group: "Kinh doanh",
    description:
      "Đã có trong danh sách fact, nhưng tạm khóa submit vì chưa đủ hợp đồng header đáng tin cậy từ workbook.",
    requiredColumns: [],
    supported: false,
    unsupportedReason:
      "Fact Doanh thu chưa có bộ header xác thực từ workbook mẫu nên đang tạm khóa để tránh đoán sai cấu trúc.",
    filterColumns: {
      company: [],
      plan: [],
      costCenter: [],
    },
  },
  {
    value: "phai_thu",
    label: "Phải thu",
    group: "Công nợ khách hàng",
    description:
      "Đã có trong danh sách fact, nhưng tạm khóa submit vì chưa đủ hợp đồng header đáng tin cậy từ workbook.",
    requiredColumns: [],
    supported: false,
    unsupportedReason:
      "Fact Phải thu chưa có bộ header xác thực từ workbook mẫu nên đang tạm khóa để tránh đoán sai cấu trúc.",
    filterColumns: {
      company: [],
      plan: [],
      costCenter: [],
    },
  },
  {
    value: "phai_tra",
    label: "Phải trả",
    group: "Công nợ nhà cung cấp",
    description:
      "Đã có trong danh sách fact, nhưng tạm khóa submit vì chưa đủ hợp đồng header đáng tin cậy từ workbook.",
    requiredColumns: [],
    supported: false,
    unsupportedReason:
      "Fact Phải trả chưa có bộ header xác thực từ workbook mẫu nên đang tạm khóa để tránh đoán sai cấu trúc.",
    filterColumns: {
      company: [],
      plan: [],
      costCenter: [],
    },
  },
];

export const getFactConfig = (fact: FactKey) =>
  FACT_REGISTRY.find((item) => item.value === fact) ?? FACT_REGISTRY[0];
