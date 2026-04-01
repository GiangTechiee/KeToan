import { ALL, type FactConfig } from "@/data/factRegistry";
import {
  getFallbackCompanyAliases,
  getFallbackCostCenterAliases,
} from "@/data/masterDataFallback";
<<<<<<< Updated upstream
import {
  isExplicitPlaceholderToken,
  normalizeLookupValue,
} from "./file-utils";
import type { FilterScope, RowData } from "./types";
=======
import { isExplicitPlaceholderToken, normalizeLookupValue } from "./file-utils";
import type { FilterScope, ImportTargetValue, RowData } from "./types";
>>>>>>> Stashed changes

export const validateDataAgainstFilters = (
  data: RowData[],
  companyId: string,
  ccId: string,
  planId: string,
  factConfig: FactConfig | null,
  scope: FilterScope,
): string[] => {
  if (!data.length || !scope.loggedInUser || !factConfig) return [];

  const permittedCompanies =
    companyId === ALL
      ? scope.userCompanies
      : scope.userCompanies.filter((c) => String(c.company_id) === companyId);

  const permittedPlans =
    planId === ALL
      ? scope.userPlans
      : scope.userPlans.filter((p) => String(p.plan_id) === planId);

  const permittedCCs =
    ccId === ALL
      ? scope.userCostCenters
      : scope.userCostCenters.filter(
          (cc) => (cc.cost_center_id ?? cc.cost_center_code) === ccId,
        );

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
      normalizeLookupValue(String(cc.cost_center_id ?? cc.cost_center_code ?? "")),
      ...getFallbackCostCenterAliases(
        String(cc.cost_center_id ?? cc.cost_center_code ?? ""),
      ).map(
        normalizeLookupValue,
      ),
    ]),
  );

  const companyErrRows: number[] = [];
  const planErrRows: number[] = [];
  const ccErrRows: number[] = [];
  const missingCompanyRows: number[] = [];
  const missingPlanRows: number[] = [];
  const missingCCRows: number[] = [];

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

    if (companyColumns.length && !cty) {
      missingCompanyRows.push(rowNum);
    }
    if (companyColumns.length && cty && !companyValidValues.has(cty)) {
      companyErrRows.push(rowNum);
    }

    if (planColumns.length && !khoi) {
      missingPlanRows.push(rowNum);
    }
    if (planColumns.length && khoi && !planValidValues.has(khoi)) {
      planErrRows.push(rowNum);
    }

    if (ccColumns.length && !bp) {
      missingCCRows.push(rowNum);
    }
    if (ccColumns.length && bp && !ccValidValues.has(bp)) {
      ccErrRows.push(rowNum);
    }
  });

  const errs: string[] = [];
  if (missingCompanyRows.length) {
    errs.push(`Cot "Cong ty": ${missingCompanyRows.length} dong dang de trong.`);
  }
  if (companyErrRows.length) {
    errs.push(
      `Cột "Công ty": ${companyErrRows.length} dòng không hợp lệ. Cho phép: ${permittedCompanies
        .map((c) => c.company_name)
        .join(", ")}`,
    );
  }
  if (missingPlanRows.length) {
    errs.push(`Cot "Khoi": ${missingPlanRows.length} dong dang de trong.`);
  }
  if (planErrRows.length) {
    errs.push(
      `Cột "Khối": ${planErrRows.length} dòng không hợp lệ. Cho phép: ${permittedPlans
        .map((p) => p.plan_name)
        .join(", ")}`,
    );
  }
  if (missingCCRows.length) {
    errs.push(`Cot "Bo phan": ${missingCCRows.length} dong dang de trong.`);
  }
  if (ccErrRows.length) {
    errs.push(
      `Cột "Bộ phận": ${ccErrRows.length} dòng không hợp lệ. Cho phép: ${permittedCCs
        .map((cc) => cc.cost_center_name)
        .join(", ")}`,
    );
  }

  return errs;
};
