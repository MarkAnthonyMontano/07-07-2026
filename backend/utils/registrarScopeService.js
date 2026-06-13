const { db3 } = require("../routes/database/database");

let registrarScopeTableReady;

const ensureRegistrarScopeTable = async () => {
  if (!registrarScopeTableReady) {
    registrarScopeTableReady = (async () => {
      await db3.query(`
        CREATE TABLE IF NOT EXISTS registrar_scope_table (
          id INT AUTO_INCREMENT PRIMARY KEY,
          employee_id VARCHAR(50) NOT NULL,
          dprtmnt_id INT NOT NULL,
          program_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_registrar_scope (employee_id, dprtmnt_id, program_id),
          INDEX idx_employee (employee_id),
          INDEX idx_dept_program (dprtmnt_id, program_id)
        )
      `);
    })().catch((error) => {
      registrarScopeTableReady = null;
      throw error;
    });
  }

  return registrarScopeTableReady;
};

const normalizeScopeInput = (scopes = []) => {
  const seen = new Set();
  const normalized = [];

  for (const scope of scopes) {
    const dprtmntId = Number(scope?.dprtmnt_id);
    const programId = Number(scope?.program_id);

    if (!Number.isFinite(dprtmntId) || !Number.isFinite(programId)) continue;

    const key = `${dprtmntId}:${programId}`;
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push({ dprtmnt_id: dprtmntId, program_id: programId });
  }

  return normalized;
};

const getScopes = async (employeeId) => {
  if (!employeeId) return [];

  await ensureRegistrarScopeTable();

  const [rows] = await db3.query(
    `SELECT
       rst.id,
       rst.employee_id,
       rst.dprtmnt_id,
       rst.program_id,
       d.dprtmnt_name,
       d.dprtmnt_code,
       pt.program_code,
       pt.program_description,
       pt.major
     FROM registrar_scope_table rst
     INNER JOIN dprtmnt_table d ON rst.dprtmnt_id = d.dprtmnt_id
     INNER JOIN program_table pt ON rst.program_id = pt.program_id
     WHERE rst.employee_id = ?
     ORDER BY d.dprtmnt_name, pt.program_code`,
    [employeeId],
  );

  return rows;
};

const getScopesForEmployees = async (employeeIds = []) => {
  const uniqueIds = [
    ...new Set(
      (Array.isArray(employeeIds) ? employeeIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  ];

  if (!uniqueIds.length) return new Map();

  await ensureRegistrarScopeTable();

  const [rows] = await db3.query(
    `SELECT
       rst.employee_id,
       rst.dprtmnt_id,
       rst.program_id,
       d.dprtmnt_name,
       d.dprtmnt_code,
       pt.program_code,
       pt.program_description,
       pt.major
     FROM registrar_scope_table rst
     INNER JOIN dprtmnt_table d ON rst.dprtmnt_id = d.dprtmnt_id
     INNER JOIN program_table pt ON rst.program_id = pt.program_id
     WHERE rst.employee_id IN (?)
     ORDER BY d.dprtmnt_name, pt.program_code`,
    [uniqueIds],
  );

  const grouped = new Map();
  for (const row of rows) {
    const key = String(row.employee_id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  return grouped;
};

const syncScopes = async (employeeId, scopes = []) => {
  if (!employeeId) return [];

  await ensureRegistrarScopeTable();

  const normalized = normalizeScopeInput(scopes);

  await db3.query("DELETE FROM registrar_scope_table WHERE employee_id = ?", [
    employeeId,
  ]);

  if (normalized.length) {
    await db3.query(
      "INSERT INTO registrar_scope_table (employee_id, dprtmnt_id, program_id) VALUES ?",
      [normalized.map((scope) => [employeeId, scope.dprtmnt_id, scope.program_id])],
    );
  }

  await syncLegacyColumns(employeeId);

  return normalized;
};

const isInScope = async (employeeId, dprtmntId, programId) => {
  if (!employeeId) return false;

  await ensureRegistrarScopeTable();

  const [[row]] = await db3.query(
    `SELECT 1
     FROM registrar_scope_table
     WHERE employee_id = ?
       AND dprtmnt_id = ?
       AND program_id = ?
     LIMIT 1`,
    [employeeId, dprtmntId, programId],
  );

  return Boolean(row);
};

const employeeHasAnyScope = async (employeeId) => {
  if (!employeeId) return false;

  await ensureRegistrarScopeTable();

  const [[row]] = await db3.query(
    `SELECT 1
     FROM registrar_scope_table
     WHERE employee_id = ?
     LIMIT 1`,
    [employeeId],
  );

  return Boolean(row);
};

const getAllowedCurriculumIds = async (employeeId) => {
  if (!employeeId) return [];

  await ensureRegistrarScopeTable();

  const [rows] = await db3.query(
    `SELECT DISTINCT ct.curriculum_id
     FROM registrar_scope_table rst
     INNER JOIN curriculum_table ct ON ct.program_id = rst.program_id
     INNER JOIN dprtmnt_curriculum_table dc ON dc.curriculum_id = ct.curriculum_id
       AND dc.dprtmnt_id = rst.dprtmnt_id
     WHERE rst.employee_id = ?`,
    [employeeId],
  );

  return rows.map((row) => row.curriculum_id);
};

const getScopedDepartmentIds = async (employeeId) => {
  if (!employeeId) return [];

  await ensureRegistrarScopeTable();

  const [rows] = await db3.query(
    `SELECT DISTINCT dprtmnt_id
     FROM registrar_scope_table
     WHERE employee_id = ?
     ORDER BY dprtmnt_id`,
    [employeeId],
  );

  return rows.map((row) => row.dprtmnt_id);
};

const resolveProgramFromCurriculum = async (curriculumId) => {
  if (!curriculumId) return null;

  const [[row]] = await db3.query(
    `SELECT
       ct.curriculum_id,
       ct.program_id,
       dc.dprtmnt_id,
       pt.program_code,
       pt.program_description
     FROM curriculum_table ct
     INNER JOIN program_table pt ON ct.program_id = pt.program_id
     LEFT JOIN dprtmnt_curriculum_table dc ON dc.curriculum_id = ct.curriculum_id
     WHERE ct.curriculum_id = ?
     LIMIT 1`,
    [curriculumId],
  );

  return row || null;
};

const syncLegacyColumns = async (employeeId) => {
  const scopes = await getScopes(employeeId);

  if (scopes.length === 1) {
    await db3.query(
      `UPDATE user_accounts
       SET dprtmnt_id = ?
       WHERE employee_id = ?`,
      [scopes[0].dprtmnt_id, employeeId],
    );

    return { dprtmnt_id: scopes[0].dprtmnt_id };
  }

  const dprtmntIds = await getScopedDepartmentIds(employeeId);
  const dprtmntId = dprtmntIds.length === 1 ? dprtmntIds[0] : null;

  await db3.query(
    `UPDATE user_accounts
     SET dprtmnt_id = ?
     WHERE employee_id = ?`,
    [dprtmntId, employeeId],
  );

  return { dprtmnt_id: dprtmntId };
};

const parseScopesFromBody = async (body = {}) => {
  if (body.scopes !== undefined && body.scopes !== null && body.scopes !== "") {
    try {
      const raw =
        typeof body.scopes === "string" ? JSON.parse(body.scopes) : body.scopes;
      return normalizeScopeInput(Array.isArray(raw) ? raw : []);
    } catch (error) {
      return [];
    }
  }

  const deptId = body.dprtmnt_id === "" ? null : Number(body.dprtmnt_id);
  const curriculumId =
    body.curriculum_id === "" || body.curriculum_id === undefined
      ? null
      : Number(body.curriculum_id);

  if (!deptId && !curriculumId) return [];

  if (curriculumId) {
    const resolved = await resolveProgramFromCurriculum(curriculumId);
    if (resolved?.program_id) {
      return normalizeScopeInput([
        {
          dprtmnt_id: resolved.dprtmnt_id || deptId,
          program_id: resolved.program_id,
        },
      ]);
    }
  }

  return [];
};

// Run once before dropping user_accounts.program_id.
const migrateLegacyScopes = async () => {
  await ensureRegistrarScopeTable();

  const [rows] = await db3.query(
    `SELECT ua.employee_id, ua.dprtmnt_id, ua.program_id AS curriculum_id
     FROM user_accounts ua
     WHERE ua.role = 'registrar'
       AND (ua.dprtmnt_id IS NOT NULL OR ua.program_id IS NOT NULL)`,
  );

  let migrated = 0;

  for (const row of rows) {
    const [[exists]] = await db3.query(
      `SELECT 1 FROM registrar_scope_table WHERE employee_id = ? LIMIT 1`,
      [row.employee_id],
    );

    if (exists) continue;

    const scopes = await parseScopesFromBody({
      dprtmnt_id: row.dprtmnt_id,
      curriculum_id: row.curriculum_id,
    });

    if (scopes.length) {
      await syncScopes(row.employee_id, scopes);
      migrated += 1;
    }
  }

  return { migrated, total: rows.length };
};

const buildEmployeeScopePayload = async (employeeId, legacyAccount = {}) => {
  const scopes = await getScopes(employeeId);
  const allowedCurriculumIds = await getAllowedCurriculumIds(employeeId);
  const dprtmntIds = await getScopedDepartmentIds(employeeId);

  let dprtmntId = legacyAccount.dprtmnt_id ?? null;
  let curriculumId = null;

  if (scopes.length === 1) {
    dprtmntId = scopes[0].dprtmnt_id;
    curriculumId = allowedCurriculumIds.find(Boolean) || null;
  } else if (scopes.length !== 1) {
    dprtmntId = dprtmntIds.length === 1 ? dprtmntIds[0] : null;
    curriculumId = null;
  }

  return {
    scopes: scopes.map((scope) => ({
      dprtmnt_id: scope.dprtmnt_id,
      program_id: scope.program_id,
      dprtmnt_name: scope.dprtmnt_name,
      dprtmnt_code: scope.dprtmnt_code,
      program_code: scope.program_code,
      program_description: scope.program_description,
      major: scope.major,
    })),
    dprtmnt_ids: dprtmntIds,
    allowed_curriculum_ids: allowedCurriculumIds,
    dprtmnt_id: dprtmntId,
    curriculum_id: curriculumId,
  };
};

const formatScopesSummary = (scopes = []) => {
  if (!scopes.length) return "";

  const grouped = new Map();
  for (const scope of scopes) {
    const deptLabel = scope.dprtmnt_name || `Dept ${scope.dprtmnt_id}`;
    if (!grouped.has(deptLabel)) grouped.set(deptLabel, []);
    grouped.get(deptLabel).push(scope.program_code || scope.program_description || scope.program_id);
  }

  return [...grouped.entries()]
    .map(([dept, programs]) => `${dept}: ${programs.join(", ")}`)
    .join(" | ");
};

const resolveRegistrarLoginFields = async (employeeId, role, legacyDprtmntId = null) => {
  if (role !== "registrar" || !employeeId) {
    return {
      department: legacyDprtmntId ?? null,
      curriculum_id: null,
    };
  }

  await ensureRegistrarScopeTable();
  const scopePayload = await buildEmployeeScopePayload(employeeId, {
    dprtmnt_id: legacyDprtmntId,
  });

  return {
    department: scopePayload.dprtmnt_id ?? legacyDprtmntId ?? null,
    curriculum_id: scopePayload.curriculum_id ?? null,
  };
};

module.exports = {
  ensureRegistrarScopeTable,
  normalizeScopeInput,
  getScopes,
  getScopesForEmployees,
  syncScopes,
  isInScope,
  employeeHasAnyScope,
  getAllowedCurriculumIds,
  getScopedDepartmentIds,
  resolveProgramFromCurriculum,
  syncLegacyColumns,
  parseScopesFromBody,
  migrateLegacyScopes,
  buildEmployeeScopePayload,
  resolveRegistrarLoginFields,
  formatScopesSummary,
};
