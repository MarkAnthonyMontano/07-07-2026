import axios from "axios";
import API_BASE_URL from "../apiConfig";

const SCOPES_STORAGE_KEY = "registrar_scopes";
const DEPARTMENT_IDS_STORAGE_KEY = "registrar_dprtmnt_ids";
const ALLOWED_CURRICULUMS_STORAGE_KEY = "registrar_allowed_curriculum_ids";

const parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const setRegistrarScopeCache = ({
  scopes = [],
  dprtmnt_ids = [],
  allowed_curriculum_ids = [],
  curriculum_id = "",
} = {}) => {
  if (typeof window === "undefined") {
    return {
      scopes: [],
      dprtmnt_ids: [],
      allowed_curriculum_ids: [],
      curriculum_id: "",
    };
  }

  localStorage.setItem(SCOPES_STORAGE_KEY, JSON.stringify(scopes));
  localStorage.setItem(DEPARTMENT_IDS_STORAGE_KEY, JSON.stringify(dprtmnt_ids));
  localStorage.setItem(
    ALLOWED_CURRICULUMS_STORAGE_KEY,
    JSON.stringify(allowed_curriculum_ids),
  );

  const nextCurriculumId =
    curriculum_id === null || curriculum_id === undefined
      ? ""
      : String(curriculum_id);
  localStorage.setItem("curriculum_id", nextCurriculumId);
  localStorage.setItem("registrar_curriculum_id", nextCurriculumId);

  return {
    scopes,
    dprtmnt_ids,
    allowed_curriculum_ids,
    curriculum_id: nextCurriculumId,
  };
};

export const getRegistrarScopes = () => {
  if (typeof window === "undefined") return [];
  return parseJsonArray(localStorage.getItem(SCOPES_STORAGE_KEY));
};

export const getScopedDepartmentIds = () => {
  if (typeof window === "undefined") return [];
  return parseJsonArray(localStorage.getItem(DEPARTMENT_IDS_STORAGE_KEY))
    .map((id) => String(id))
    .filter(Boolean);
};

export const getAllowedCurriculumIds = () => {
  if (typeof window === "undefined") return [];
  return parseJsonArray(localStorage.getItem(ALLOWED_CURRICULUMS_STORAGE_KEY))
    .map((id) => String(id))
    .filter(Boolean);
};

export const setRegistrarCurriculumId = (value) => {
  if (typeof window === "undefined") return "";

  const curriculumId = value === null || value === undefined ? "" : String(value);
  localStorage.setItem("curriculum_id", curriculumId);
  localStorage.setItem("registrar_curriculum_id", curriculumId);
  return curriculumId;
};

export const syncRegistrarScopeFromPayload = ({
  scopes = [],
  dprtmnt_ids = [],
  allowed_curriculum_ids = [],
  curriculum_id = "",
} = {}) => {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem("role") !== "registrar") return null;

  const cache = setRegistrarScopeCache({
    scopes,
    dprtmnt_ids,
    allowed_curriculum_ids,
    curriculum_id,
  });

  window.dispatchEvent(
    new CustomEvent("registrar-curriculum-updated", {
      detail: {
        curriculum_id: cache.curriculum_id,
        scopes: cache.scopes,
      },
    }),
  );

  return cache;
};

export const syncRegistrarScopeFromAdminData = (adminData = {}) =>
  syncRegistrarScopeFromPayload({
    scopes: adminData?.scopes || [],
    dprtmnt_ids: adminData?.dprtmnt_ids || [],
    allowed_curriculum_ids: adminData?.allowed_curriculum_ids || [],
    curriculum_id: adminData?.curriculum_id || "",
  });

export const syncRegistrarScopeFromEmployeeResponse = (employeeData = {}) =>
  syncRegistrarScopeFromPayload({
    scopes: employeeData?.scopes || [],
    dprtmnt_ids: employeeData?.dprtmnt_ids || [],
    allowed_curriculum_ids: employeeData?.allowed_curriculum_ids || [],
    curriculum_id: employeeData?.curriculum_id || "",
  });

export const refreshRegistrarCurriculumId = async (employeeId) => {
  if (typeof window === "undefined") return "";
  if (localStorage.getItem("role") !== "registrar") return "";

  const currentEmployeeId = employeeId || localStorage.getItem("employee_id");
  if (!currentEmployeeId) return "";

  const response = await axios.get(`${API_BASE_URL}/api/employee/${currentEmployeeId}`);
  const cache = syncRegistrarScopeFromEmployeeResponse(response.data);

  return cache?.curriculum_id || "";
};

export const getRegistrarCurriculumId = () => {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("curriculum_id") ||
    localStorage.getItem("registrar_curriculum_id") ||
    ""
  );
};

export const hasRegistrarScope = () => getRegistrarScopes().length > 0;

export const hasRegistrarCurriculumRestriction = () => {
  const allowedCurriculumIds = getAllowedCurriculumIds();
  if (allowedCurriculumIds.length > 0) return true;
  if (getRegistrarScopes().length > 0) return true;
  return Boolean(getRegistrarCurriculumId());
};

export const isRegistrarProgramSelectionLocked = () => {
  if (getAllowedCurriculumIds().length > 1) return false;
  return hasRegistrarCurriculumRestriction();
};

export const isRegistrarCurriculumMatch = (value) => {
  const allowedCurriculumIds = getAllowedCurriculumIds();
  const scopes = getRegistrarScopes();

  if (scopes.length > 0 && allowedCurriculumIds.length === 0) {
    return false;
  }

  if (allowedCurriculumIds.length > 0) {
    if (value === null || value === undefined || value === "") return false;
    return allowedCurriculumIds.includes(String(value));
  }

  if (scopes.length > 0) return false;

  const curriculumId = getRegistrarCurriculumId();
  if (!curriculumId) return true;
  if (value === null || value === undefined || value === "") return false;

  return String(value) === String(curriculumId);
};

export const restrictToRegistrarCurriculum = (items = [], getValue) => {
  const allowedCurriculumIds = getAllowedCurriculumIds();
  if (allowedCurriculumIds.length > 0) {
    return items.filter((item) => {
      const value = getValue
        ? getValue(item)
        : item?.curriculum_id ?? item?.program ?? item?.active_curriculum;
      return allowedCurriculumIds.includes(String(value ?? ""));
    });
  }

  const scopes = getRegistrarScopes();
  if (scopes.length > 0) {
    const programIds = new Set(
      scopes.map((scope) => String(scope.program_id)).filter(Boolean),
    );
    return items.filter((item) =>
      programIds.has(String(item?.program_id ?? "")),
    );
  }

  const curriculumId = getRegistrarCurriculumId();
  if (!curriculumId) return items;

  return items.filter((item) => {
    const value = getValue
      ? getValue(item)
      : item?.curriculum_id ?? item?.program ?? item?.active_curriculum;
    return String(value ?? "") === String(curriculumId);
  });
};
