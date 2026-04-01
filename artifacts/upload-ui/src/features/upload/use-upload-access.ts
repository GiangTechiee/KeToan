import { useEffect, useMemo, useState } from "react";

import { ALL } from "@/data/factRegistry";
import {
  FALLBACK_COMPANIES,
  FALLBACK_COST_CENTERS,
  FALLBACK_PLANS,
  FALLBACK_USER_FILE_PERMISSIONS,
  FALLBACK_USER_MAPPINGS,
  FALLBACK_USERS_APP,
  getFallbackCompanyIdByCode,
  resolveFallbackPlanIds,
} from "@/data/masterDataFallback";
import { supabase } from "@/lib/supabase";
import type { Company, CostCenter, Plan, UsersApp } from "@/types/supabase";

export const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
];

export const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

export function useUploadAccess() {
  const [allUsers, setAllUsers] = useState<UsersApp[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [allCostCenters, setAllCostCenters] = useState<CostCenter[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);
  const [masterDataNotice, setMasterDataNotice] = useState<string | null>(null);
  const [usersFallbackActive, setUsersFallbackActive] = useState(false);

  const [loggedInUser, setLoggedInUser] = useState<UsersApp | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginPopoverOpen, setLoginPopoverOpen] = useState(false);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(ALL);
  const [selectedCCId, setSelectedCCId] = useState<string>(ALL);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(ALL);

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
      setAllCompanies(useCompaniesFallback ? FALLBACK_COMPANIES : liveCompanies);
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
          ? `Dang dung du lieu fallback workbook cho: ${fallbackDetails.join(", ")}.`
          : null,
      );
      setIsLoadingMaster(false);
    };

    void load();
  }, []);

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
      const planIds = new Set<number>(resolveFallbackPlanIds(mapping.planTokens));
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
      .filter((company) => ids.has(company.company_id))
      .sort((a, b) => a.company_id - b.company_id);
  }, [allowedCostCenters, allCompanies]);

  const userPlans = useMemo(() => {
    const ids = new Set(allowedCostCenters.map((cc) => cc.plan_id));
    return allPlans
      .filter((plan) => ids.has(plan.plan_id))
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
    (plan) => String(plan.plan_id) === selectedPlanId,
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
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setSelectedCompanyId(ALL);
    setSelectedCCId(ALL);
    setSelectedPlanId(ALL);
  };

  const handleCompanyChange = (value: string) => {
    setSelectedCompanyId(value);
    setSelectedCCId(ALL);
    setSelectedPlanId(ALL);
  };

  return {
    allCompanies,
    allUsers,
    canCreate,
    canRead,
    handleCompanyChange,
    handleLoginAs,
    handleLogout,
    isLoadingMaster,
    isLoggingIn,
    loggedInUser,
    loginPopoverOpen,
    masterDataNotice,
    resolvedCCId,
    resolvedCompanyId,
    selectedCCId,
    selectedCompanyId,
    selectedPlan,
    selectedPlanId,
    setLoginPopoverOpen,
    setSelectedCCId,
    setSelectedPlanId,
    userCompanies,
    userCostCenters,
    userPlans,
  };
}
