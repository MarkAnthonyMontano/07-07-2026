const express = require('express');
const { db, db3 } = require('../database/database');
const {
  CanCreate,
  CanDelete,
  CanEdit,
} = require("../../middleware/pagePermissions");
const { insertAuditLogAdmission } = require("../../utils/auditLogger");

const router = express.Router();

const formatAuditActorRole = (role) => {
  const safeRole = String(role || "registrar").trim();
  if (!safeRole) return "Registrar";

  return safeRole
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const getAuditActor = (req) => ({
  actorId:
    req.body?.audit_actor_id ||
    req.headers["x-audit-actor-id"] ||
    req.headers["x-employee-id"] ||
    "unknown",
  actorRole:
    req.body?.audit_actor_role ||
    req.headers["x-audit-actor-role"] ||
    "registrar",
});

const insertEmailTemplateAuditLog = async ({ req, action, message }) => {
  const { actorId, actorRole } = getAuditActor(req);

  await insertAuditLogAdmission({
    actorId,
    role: actorRole,
    action,
    message,
    severity: "INFO",
  });
};

const getActorLabel = (req) => {
  const { actorId, actorRole } = getAuditActor(req);
  return {
    actorId,
    roleLabel: formatAuditActorRole(actorRole),
  };
};

const formatPersonName = (row = {}) => {
  const name = [row.first_name, row.middle_name, row.last_name]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return name || row.email || "Unknown Employee";
};

const formatEmployeeLabel = (row = {}) =>
  `${formatPersonName(row)} (${row.employee_id || "unknown"})`;

const getActorAuditLabel = async (req) => {
  const { actorId, roleLabel } = getActorLabel(req);

  try {
    const [rows] = await db3.query(
      `SELECT ua.employee_id, ua.first_name, ua.middle_name, ua.last_name, ua.email,
              at.access_description
       FROM user_accounts ua
       LEFT JOIN access_table at ON at.access_id = ua.access_level
       WHERE ua.employee_id = ?
          OR ua.person_id = ?
          OR ua.email = ?
       LIMIT 1`,
      [actorId, actorId, actorId],
    );

    if (rows?.[0]) {
      const accessLabel = String(rows[0].access_description || "").trim();
      return `${accessLabel || roleLabel} ${formatEmployeeLabel(rows[0])}`;
    }
  } catch (err) {
    console.error("Email template actor audit lookup failed:", err);
  }

  return `${roleLabel} (${actorId})`;
};

const getTaggedEmployeeLabels = async (employeeIds) => {
  if (!employeeIds.length) return [];

  const [rows] = await db3.query(
    `SELECT employee_id, first_name, middle_name, last_name, email
     FROM user_accounts
     WHERE employee_id IN (?)`,
    [employeeIds],
  );

  const lookup = new Map(
    rows.map((row) => [String(row.employee_id), formatEmployeeLabel(row)]),
  );

  return employeeIds.map(
    (employeeId) => lookup.get(String(employeeId)) || `Employee (${employeeId})`,
  );
};

const getConfiguredSenderEmails = () =>
  [
    process.env.EMAIL_USER1,
    process.env.EMAIL_USER2,
    process.env.EMAIL_USER3,
    process.env.EMAIL_USER4,
    process.env.EMAIL_USER5,
    process.env.EMAIL_USER6,
    process.env.EMAIL_USER7,
    process.env.EMAIL_USER8,
    process.env.EMAIL_USER9,
    process.env.EMAIL_USER10,
  ]
    .filter(Boolean)
    .map((email) => email.trim().toLowerCase());

const normalizeSenderEmail = (senderEmail) =>
  String(senderEmail || "").trim().toLowerCase();

const isConfiguredSenderEmail = (senderEmail) =>
  getConfiguredSenderEmails().includes(normalizeSenderEmail(senderEmail));

// GET all templates with department name
router.get("/email-templates", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        et.*,
        dpr.dprtmnt_name AS department_name,
        pt.program_code,
        pt.program_description,
        pt.major,
        COALESCE(tagged.employee_count, 0) AS tagged_employee_count
      FROM email_templates et
      LEFT JOIN enrollment.dprtmnt_table dpr
      ON et.department_id = dpr.dprtmnt_id
      LEFT JOIN enrollment.curriculum_table ct
      ON et.program_id = ct.curriculum_id
      LEFT JOIN enrollment.program_table pt
      ON ct.program_id = pt.program_id
      LEFT JOIN (
        SELECT template_id, COUNT(*) AS employee_count
        FROM email_template_employees
        GROUP BY template_id
      ) tagged
      ON et.template_id = tagged.template_id
      ORDER BY et.updated_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// CREATE template
router.post("/email-templates", CanCreate, async (req, res) => {
  try {
    const { sender_name, department_id, program_id, is_active = 1 } = req.body;
    const senderEmail = normalizeSenderEmail(sender_name);

    if (!senderEmail || !department_id || !program_id)
      return res
        .status(400)
        .json({ error: "Gmail account, department, and program are required" });

    if (!isConfiguredSenderEmail(senderEmail)) {
      return res.status(400).json({
        error: "Gmail account must match a configured sender email in the backend .env file",
      });
    }

    const [result] = await db.query(
      "INSERT INTO email_templates (sender_name, department_id, program_id, is_active) VALUES (?, ?, ?, ?)",
      [senderEmail, department_id, program_id, is_active ? 1 : 0],
    );

    const actorLabel = await getActorAuditLabel(req);
    await insertEmailTemplateAuditLog({
      req,
      action: "EMAIL_TEMPLATE_CREATE",
      message: `${actorLabel} created email template for ${senderEmail}.`,
    });

    res.status(201).json({ template_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create template" });
  }
});

// UPDATE template
router.put("/email-templates/:id", CanEdit, async (req, res) => {
  try {
    const { sender_name, department_id, program_id, is_active } = req.body;
    const senderEmail =
      sender_name === undefined ? undefined : normalizeSenderEmail(sender_name);

    if (senderEmail !== undefined && !senderEmail) {
      return res.status(400).json({ error: "Gmail account is required" });
    }

    if (senderEmail !== undefined && !isConfiguredSenderEmail(senderEmail)) {
      return res.status(400).json({
        error: "Gmail account must match a configured sender email in the backend .env file",
      });
    }

    const [result] = await db.query(
      `UPDATE email_templates
       SET sender_name = COALESCE(?, sender_name),
           department_id = COALESCE(?, department_id),
           program_id = COALESCE(?, program_id),
           is_active = COALESCE(?, is_active)
       WHERE template_id = ?`,
      [senderEmail, department_id, program_id, is_active, req.params.id],
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Not found" });

    const templateLabel = senderEmail || `template ID ${req.params.id}`;
    const actorLabel = await getActorAuditLabel(req);
    await insertEmailTemplateAuditLog({
      req,
      action: "EMAIL_TEMPLATE_UPDATE",
      message: `${actorLabel} updated email template ${templateLabel}.`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update template" });
  }
});

// DELETE template
router.delete("/email-templates/:id", CanDelete, async (req, res) => {
  try {
    const [[template]] = await db.query(
      "SELECT sender_name FROM email_templates WHERE template_id = ? LIMIT 1",
      [req.params.id],
    );

    await db.query("DELETE FROM email_template_employees WHERE template_id = ?", [
      req.params.id,
    ]);

    const [result] = await db.query(
      "DELETE FROM email_templates WHERE template_id = ?",
      [req.params.id],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Not found" });

    const templateLabel = template?.sender_name || `template ID ${req.params.id}`;
    const actorLabel = await getActorAuditLabel(req);
    await insertEmailTemplateAuditLog({
      req,
      action: "EMAIL_TEMPLATE_DELETE",
      message: `${actorLabel} deleted email template ${templateLabel}.`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

router.get("/email-templates/:id/employees", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         ete.employee_id,
         ua.first_name,
         ua.middle_name,
         ua.last_name,
         ua.email,
         ua.role AS position,
         ua.dprtmnt_id
       FROM email_template_employees ete
       LEFT JOIN enrollment.user_accounts ua
       ON ete.employee_id = ua.employee_id
       WHERE ete.template_id = ?
       ORDER BY ua.last_name, ua.first_name, ete.employee_id`,
      [req.params.id],
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tagged employees" });
  }
});

router.put("/email-templates/:id/employees", CanEdit, async (req, res) => {
  try {
    const { employee_ids = [] } = req.body;
    const uniqueEmployeeIds = [
      ...new Set(
        (Array.isArray(employee_ids) ? employee_ids : [])
          .map((id) => String(id || "").trim())
          .filter(Boolean),
      ),
    ];

    if (uniqueEmployeeIds.length === 0) {
      return res.status(400).json({ error: "Please select at least one employee" });
    }

    const [[template]] = await db.query(
      "SELECT sender_name FROM email_templates WHERE template_id = ? LIMIT 1",
      [req.params.id],
    );

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    await db.query("DELETE FROM email_template_employees WHERE template_id = ?", [
      req.params.id,
    ]);

    await db.query(
      "INSERT INTO email_template_employees (template_id, employee_id) VALUES ?",
      [uniqueEmployeeIds.map((employeeId) => [req.params.id, employeeId])],
    );

    const actorLabel = await getActorAuditLabel(req);
    const taggedEmployeeLabels = await getTaggedEmployeeLabels(uniqueEmployeeIds);
    await insertEmailTemplateAuditLog({
      req,
      action: "EMAIL_TEMPLATE_EMPLOYEE_TAG",
      message: `${actorLabel} tagged ${taggedEmployeeLabels.join(", ")} to email ${template.sender_name}.`,
    });

    res.json({ success: true, employee_count: uniqueEmployeeIds.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save tagged employees" });
  }
});

router.get("/email-templates/active-senders", async (req, res) => {
  const { department_id, program_id, employee_id } = req.query;

  try {
    if (!department_id || !program_id || !employee_id) {
      return res.status(400).json({
        error: "Department, program, and employee are required",
      });
    }

    const [rows] = await db.query(
      `SELECT et.template_id, et.sender_name
       FROM email_templates et
       INNER JOIN email_template_employees ete
       ON et.template_id = ete.template_id
       WHERE et.is_active = 1
         AND et.department_id = ?
         AND et.program_id = ?
         AND ete.employee_id = ?
       ORDER BY et.updated_at DESC`,
      [department_id, program_id, employee_id],
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch active senders" });
  }
});

module.exports = router;
