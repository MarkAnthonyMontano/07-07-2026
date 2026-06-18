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

export const getDepartmentIdsFromAdminData = (adminData = {}) => {
  if (Array.isArray(adminData.dprtmnt_ids) && adminData.dprtmnt_ids.length) {
    return adminData.dprtmnt_ids;
  }
  if (
    adminData.dprtmnt_id !== null &&
    adminData.dprtmnt_id !== undefined &&
    adminData.dprtmnt_id !== ""
  ) {
    return [adminData.dprtmnt_id];
  }
  return [];
};

export const normalizeDepartmentId = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
};

export const departmentIdsMatch = (left, right) =>
  normalizeDepartmentId(left) === normalizeDepartmentId(right);

export const getDepartmentsFromAdminScopes = (adminData = {}) => {
  const departmentIds = getDepartmentIdsFromAdminData(adminData).map((id) =>
    normalizeDepartmentId(id),
  );
  const scopes = Array.isArray(adminData.scopes) ? adminData.scopes : [];
  const scopeById = new Map(
    scopes.map((scope) => [normalizeDepartmentId(scope.dprtmnt_id), scope]),
  );

  const ids = departmentIds.length
    ? departmentIds
    : [...scopeById.keys()].filter(Boolean);

  return ids.map((id) => {
    const scope = scopeById.get(id) || {};
    return {
      dprtmnt_id: id,
      dprtmnt_name: scope.dprtmnt_name || `Department ${id}`,
      dprtmnt_code: scope.dprtmnt_code || "",
    };
  });
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

  if (allowedCurriculumIds.length > 0) {
    if (value === null || value === undefined || value === "") return false;
    return allowedCurriculumIds.includes(String(value));
  }

  if (scopes.length > 0) {
    return false;
  }

  const curriculumId = getRegistrarCurriculumId();
  if (!curriculumId) return true;
  if (value === null || value === undefined || value === "") return false;

  return String(value) === String(curriculumId);
};

export const getScopedProgramIdsForDepartment = (departmentId = "") => {
  const scopes = getRegistrarScopes();
  if (!scopes.length) return null;

  const normalizedDept = normalizeDepartmentId(departmentId);
  const relevantScopes = normalizedDept
    ? scopes.filter((scope) => departmentIdsMatch(scope.dprtmnt_id, normalizedDept))
    : scopes;

  return new Set(
    relevantScopes.map((scope) => String(scope.program_id)).filter(Boolean),
  );
};

export const isRegistrarStudentScopeMatch = (student = {}) => {
  if (!hasRegistrarCurriculumRestriction()) return true;

  const allowedCurriculumIds = getAllowedCurriculumIds();
  const curriculumId =
    student.curriculum_id ??
    student.active_curriculum ??
    student.program ??
    "";

  if (allowedCurriculumIds.length > 0) {
    if (!curriculumId) return false;
    return allowedCurriculumIds.includes(String(curriculumId));
  }

  const scopes = getRegistrarScopes();
  if (scopes.length > 0) {
    const programId = String(student.program_id ?? "");
    const departmentId = normalizeDepartmentId(
      student.dprtmnt_id ?? student.department_id ?? "",
    );

    if (programId) {
      return scopes.some(
        (scope) =>
          String(scope.program_id) === programId &&
          (!departmentId || departmentIdsMatch(scope.dprtmnt_id, departmentId)),
      );
    }

    if (curriculumId) {
      return restrictToRegistrarCurriculum(
        [{ curriculum_id: curriculumId }],
        (item) => item.curriculum_id,
      ).length > 0;
    }

    return false;
  }

  const lockedCurriculumId = getRegistrarCurriculumId();
  if (!lockedCurriculumId) return true;
  if (!curriculumId) return false;
  return String(curriculumId) === String(lockedCurriculumId);
};

export const isRegistrarApplicantScopeMatch = (
  applicant = {},
  { curriculumId, programId } = {},
) => {
  if (!hasRegistrarCurriculumRestriction()) return true;

  const resolvedCurriculumId =
    curriculumId ??
    applicant.program ??
    applicant.curriculum_id ??
    applicant.active_curriculum ??
    "";
  const resolvedProgramId = programId ?? applicant.program_id ?? "";

  const allowedCurriculumIds = getAllowedCurriculumIds();
  if (allowedCurriculumIds.length > 0) {
    if (!resolvedCurriculumId) return false;
    return allowedCurriculumIds.includes(String(resolvedCurriculumId));
  }

  const scopes = getRegistrarScopes();
  if (scopes.length > 0) {
    if (resolvedProgramId) {
      return scopes.some(
        (scope) => String(scope.program_id) === String(resolvedProgramId),
      );
    }

    if (resolvedCurriculumId) {
      return restrictToRegistrarCurriculum(
        [{ curriculum_id: resolvedCurriculumId }],
        (item) => item.curriculum_id,
      ).length > 0;
    }

    return false;
  }

  return isRegistrarCurriculumMatch(resolvedCurriculumId);
};

export const isRegistrarProgramScopeMatch = (
  programId,
  departmentId = "",
) => {
  if (!hasRegistrarCurriculumRestriction()) return true;

  const scopedProgramIds = getScopedProgramIdsForDepartment(departmentId);
  if (scopedProgramIds) {
    if (!programId) return false;
    return scopedProgramIds.has(String(programId));
  }

  return true;
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

export const resolveStudentRegistrarScope = async (
  studentNumber,
  { activeSchoolYearId } = {},
) => {
  const employeeId =
    typeof window !== "undefined"
      ? localStorage.getItem("employee_id") || undefined
      : undefined;

  try {
    const scopeRes = await axios.post(
      `${API_BASE_URL}/api/registrar/resolve-student-scope`,
      {
        studentNumber,
        active_school_year_id: activeSchoolYearId || undefined,
        employee_id: employeeId,
      },
      { headers: { "Content-Type": "application/json" } },
    );

    const { dprtmntId } = scopeRes.data;
    const payload = { studentNumber, dprtmntId };
    if (activeSchoolYearId) {
      payload.active_school_year_id = activeSchoolYearId;
    }

    const response = await axios.post(
      `${API_BASE_URL}/api/student-tagging/dprtmnt`,
      payload,
      { headers: { "Content-Type": "application/json" } },
    );

    return {
      dprtmntId,
      preload: response.data,
      context: scopeRes.data.context,
      curriculumId: scopeRes.data.curriculumId,
      programId: scopeRes.data.programId,
    };
  } catch (err) {
    return {
      error:
        err.response?.data?.message ||
        "Student not found or is outside your assigned programs.",
    };
  }
};
