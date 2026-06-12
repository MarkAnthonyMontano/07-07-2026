const express = require("express");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { db, db3 } = require("../database/database");
const { CanCreate, CanDelete } = require("../../middleware/pagePermissions");
const { insertAuditLogEnrollment } = require("../../utils/auditLogger");

require("dotenv").config();

const router = express.Router();
const facultyImageUploadDir = path.join(__dirname, "../../uploads/Faculty1by1");

const ensureFacultyImageUploadDir = async () => {
  await fs.promises.mkdir(facultyImageUploadDir, { recursive: true });
};

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

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

const getProfessorLabel = (prof) => {
  if (!prof) return "Unknown Professor";
  const name = [prof.lname, prof.fname, prof.mname].filter(Boolean).join(", ");
  return prof.employee_id || name || prof.email || `prof_id ${prof.prof_id || "unknown"}`;
};

const insertFacultyAuditLog = async ({ req, action, message, severity = "INFO" }) => {
  const { actorId, actorRole } = getAuditActor(req);

  await insertAuditLogEnrollment({
    actorId,
    role: actorRole,
    action,
    severity,
    message,
  });
};

const generateTemporaryPassword = (length = 10) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const normalizeImportText = (value) => String(value ?? "").trim();

router.post("/update_faculty", upload.single("profile_picture"), async (req, res) => {
  const { employee_id } = req.body;

  if (!employee_id || !req.file) {
    return res.status(400).send("Missing employee_id or file.");
  }

  try {
    // ✅ Get student_number from person_id
    const [rows] = await db3.query(
      "SELECT employee_id FROM prof_table WHERE employee_id = ?",
      [employee_id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Faculty not found for employee_id " + employee_id });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const year = new Date().getFullYear();
    const filename = `${employee_id}_1by1_${year}${ext}`;
    await ensureFacultyImageUploadDir();
    const finalPath = path.join(facultyImageUploadDir, filename);

    const files = await fs.promises.readdir(facultyImageUploadDir);
    for (const file of files) {
      if (file.startsWith(`${employee_id}_1by1_`)) {
        await fs.promises.unlink(path.join(facultyImageUploadDir, file));
      }
    }

    await fs.promises.writeFile(finalPath, req.file.buffer);

    await db3.query("UPDATE prof_table SET profile_image = ? WHERE employee_id = ?", [filename, employee_id]);

    res.status(200).json({ message: "Uploaded successfully", filename });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).send("Failed to upload image.");
  }
});

router.post("/professors/export-audit", async (req, res) => {
  const exportedCount = Number(req.body?.exported_count || 0);
  const fileName = normalizeImportText(req.body?.file_name) || "professors.csv";

  try {
    const { actorId, actorRole } = getAuditActor(req);
    const roleLabel = formatAuditActorRole(actorRole);
    await insertFacultyAuditLog({
      req,
      action: "PROFESSOR_ACCOUNT_EXPORT",
      message: `${roleLabel} (${actorId}) exported ${exportedCount} professor account record(s) to ${fileName}.`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to insert professor export audit log:", err);
    res.status(500).json({
      success: false,
      message: "Failed to insert export audit log",
    });
  }
});

// Fetch all professors
router.get("/professors", async (req, res) => {
  try {
    const [rows] = await db3.query(`
      SELECT
        pft.prof_id,
        pft.person_id,
        pft.employee_id,
        pft.fname,
        pft.mname,
        pft.lname,
        pft.email,
        pft.role,
        pft.status,
        pft.profile_image,
        dpt.dprtmnt_id,
        dpt.dprtmnt_name,
        dpt.dprtmnt_code
      FROM prof_table AS pft
      LEFT JOIN (
        SELECT dpft_current.*
        FROM dprtmnt_profs_table AS dpft_current
        INNER JOIN (
          SELECT prof_id, MAX(dprtmnt_profs_id) AS latest_id
          FROM dprtmnt_profs_table
          GROUP BY prof_id
        ) AS latest_dpft
          ON latest_dpft.latest_id = dpft_current.dprtmnt_profs_id
      ) AS dpft
        ON dpft.prof_id = pft.prof_id
      LEFT JOIN dprtmnt_table AS dpt 
        ON dpft.dprtmnt_id = dpt.dprtmnt_id
      ORDER BY pft.prof_id ASC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: "Failed to retrieve professors",
      details: err.message
    });
  }
});

// ADD PROFESSOR ROUTE (Consistent with /api)
router.post(
  "/register_prof",
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const {
        person_id,
        employee_id,
        fname,
        mname,
        lname,
        email,
        password,
        dprtmnt_id,
        role,
      } = req.body;

      if (!employee_id || !fname || !lname || !email || !password || !dprtmnt_id) {
        return res.status(400).json({
          success: false,
          error: "Employee ID, first name, last name, email, password, and department are required.",
        });
      }

      const [existingUser] = await db3.query(
        "SELECT * FROM prof_table WHERE email = ? OR employee_id = ?",
        [email, employee_id],
      );

      if (existingUser.length > 0) {
        return res.json({
          success: false,
          error: "Email or Employee ID already exists. Please use different credentials.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      let profileImage = "";
      if (req.file) {
        const year = new Date().getFullYear();
        const ext = path.extname(req.file.originalname).toLowerCase();
        const filename = `${employee_id}_ProfessorProfile_${year}${ext}`;
        await ensureFacultyImageUploadDir();
        const filePath = path.join(facultyImageUploadDir, filename);
        await fs.promises.writeFile(filePath, req.file.buffer);
        profileImage = filename;
      }

      const sql = `INSERT INTO prof_table (person_id, employee_id, fname, mname, lname, email, password, role, profile_image, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const values = [
        person_id || null,
        employee_id,
        fname,
        mname,
        lname,
        email,
        hashedPassword,
        role,
        profileImage,
        1,  // ✅ status = Active by default
      ];

      const [result] = await db3.query(sql, values);
      const prof_id = result.insertId;

      // ✅ Force password change + disable OTP on first login
      // REPLACE WITH:
      await db3.query(
        `UPDATE prof_table SET force_password_change = 1, totp_enabled = 0 WHERE prof_id = ?`,
        [prof_id]
      );

      const sql2 = `INSERT INTO dprtmnt_profs_table (dprtmnt_id, prof_id) VALUES (?, ?)`;
      await db3.query(sql2, [dprtmnt_id, prof_id]);

      const { actorId, actorRole } = getAuditActor(req);
      const roleLabel = formatAuditActorRole(actorRole);
      await insertFacultyAuditLog({
        req,
        action: "PROFESSOR_ACCOUNT_CREATE",
        message: `${roleLabel} (${actorId}) created professor account ${employee_id} - ${lname}, ${fname}.`,
      });

      res.status(201).json({ success: true, message: "Professor added successfully" });
    } catch (err) {
      console.error("Insert error:", err);
      res.json({ success: false, error: "Failed to add professor" });
    }
  },
);

// Update professor info
router.put(
  "/update_prof/:id",
  upload.single("profileImage"),
  async (req, res) => {
    const id = req.params.id;
    const {
      employee_id,
      fname,
      mname,
      lname,
      email,
      password,
      dprtmnt_id,
      role,
    } = req.body;

    try {
      if (!employee_id || !fname || !lname || !email || !dprtmnt_id) {
        return res.status(400).json({
          success: false,
          error: "Employee ID, first name, last name, email, and department are required.",
        });
      }

      const checkSQL = `SELECT * FROM prof_table WHERE (email = ? OR employee_id = ?) AND prof_id != ?`;
      const [existingRows] = await db3.query(checkSQL, [email, employee_id, id]);

      if (existingRows.length > 0) {
        return res.json({
          success: false,
          error: "Email or Employee ID already exists for another professor.",
        });
      }

      let profileImage = null;

      if (req.file) {
        const year = new Date().getFullYear();
        const ext = path.extname(req.file.originalname).toLowerCase();
        const filename = `${employee_id}_ProfessorProfile_${year}${ext}`;
        await ensureFacultyImageUploadDir();
        const filePath = path.join(facultyImageUploadDir, filename);
        await fs.promises.writeFile(filePath, req.file.buffer);
        profileImage = filename;
      }

      let updateSQL;
      let values;

      if (password && profileImage) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateSQL = `
          UPDATE prof_table
          SET employee_id = ?, fname = ?, mname = ?, lname = ?, email = ?, password = ?, role = ?, profile_image = ?
          WHERE prof_id = ?
        `;
        values = [employee_id, fname, mname, lname, email, hashedPassword, role, profileImage, id];
      } else if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateSQL = `
          UPDATE prof_table
          SET employee_id = ?, fname = ?, mname = ?, lname = ?, email = ?, password = ?, role = ?
          WHERE prof_id = ?
        `;
        values = [employee_id, fname, mname, lname, email, hashedPassword, role, id];
      } else if (profileImage) {
        updateSQL = `
          UPDATE prof_table
          SET employee_id = ?, fname = ?, mname = ?, lname = ?, email = ?, role = ?, profile_image = ?
          WHERE prof_id = ?
        `;
        values = [employee_id, fname, mname, lname, email, role, profileImage, id];
      } else {
        updateSQL = `
          UPDATE prof_table
          SET employee_id = ?, fname = ?, mname = ?, lname = ?, email = ?, role = ?
          WHERE prof_id = ?
        `;
        values = [employee_id, fname, mname, lname, email, role, id];
      }

      await db3.query(updateSQL, values);

      // ✅ If admin set a new password, force password change + disable OTP
      if (password) {
        await db3.query(
          `UPDATE prof_table SET force_password_change = 1, totp_enabled = 0 WHERE prof_id = ?`,
          [id]
        );
      }

      if (dprtmnt_id) {
        const [existing] = await db3.query(
          `SELECT * FROM dprtmnt_profs_table WHERE prof_id = ?`,
          [id],
        );

        if (existing.length > 0) {
          await db3.query(
            `UPDATE dprtmnt_profs_table SET dprtmnt_id = ? WHERE prof_id = ?`,
            [dprtmnt_id, id],
          );
        } else {
          await db3.query(
            `INSERT INTO dprtmnt_profs_table (dprtmnt_id, prof_id) VALUES (?, ?)`,
            [dprtmnt_id, id],
          );
        }
      }

      const { actorId, actorRole } = getAuditActor(req);
      const roleLabel = formatAuditActorRole(actorRole);
      await insertFacultyAuditLog({
        req,
        action: "PROFESSOR_ACCOUNT_UPDATE",
        message: `${roleLabel} (${actorId}) updated professor account ${employee_id} - ${lname}, ${fname}.`,
      });

      res.json({ success: true, message: "Professor updated successfully." });
    } catch (err) {
      res.json({ success: false, error: "Internal server error." });
    }
  },
);

// Toggle professor status (Active/Inactive)
router.put("/update_prof_status/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const [profRows] = await db3.query(
      "SELECT prof_id, employee_id, fname, mname, lname, email FROM prof_table WHERE prof_id = ? LIMIT 1",
      [id],
    );

    const [result] = await db3.query(
      "UPDATE prof_table SET status = ? WHERE prof_id = ?",
      [status, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Professor not found" });
    }

    const { actorId, actorRole } = getAuditActor(req);
    const roleLabel = formatAuditActorRole(actorRole);
    await insertFacultyAuditLog({
      req,
      action: "PROFESSOR_ACCOUNT_STATUS_UPDATE",
      message: `${roleLabel} (${actorId}) set professor account ${getProfessorLabel(profRows[0])} to ${Number(status) === 1 ? "Active" : "Inactive"}.`,
    });

    res.json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("Status update error:", err);
    res
      .status(500)
      .json({ error: "Failed to update status", details: err.message });
  }
});

router.delete("/delete_prof/:id", CanDelete, async (req, res) => {
  const { id } = req.params;
  let conn;

  try {
    conn = await db3.getConnection();
    await conn.beginTransaction();

    const [profRows] = await conn.query(
      "SELECT prof_id, employee_id, fname, mname, lname, email, profile_image FROM prof_table WHERE prof_id = ? LIMIT 1",
      [id],
    );

    if (profRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: "Professor not found" });
    }

    const [scheduleRows] = await conn.query(
      "SELECT id FROM time_table WHERE professor_id = ? LIMIT 1",
      [id],
    );

    if (scheduleRows.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        error: "Professor cannot be deleted because they are assigned to a schedule.",
      });
    }

    await conn.query("DELETE FROM dprtmnt_profs_table WHERE prof_id = ?", [id]);
    await conn.query("DELETE FROM prof_table WHERE prof_id = ?", [id]);

    await conn.commit();

    const profileImage = profRows[0].profile_image;
    if (profileImage) {
      const uploadDirs = [
        facultyImageUploadDir,
      ];

      for (const uploadDir of uploadDirs) {
        const imagePath = path.join(uploadDir, profileImage);
        try {
          if (fs.existsSync(imagePath)) {
            await fs.promises.unlink(imagePath);
          }
        } catch (fileErr) {
          console.error("Failed to delete professor image:", fileErr.message);
        }
      }
    }

    const { actorId, actorRole } = getAuditActor(req);
    const roleLabel = formatAuditActorRole(actorRole);
    await insertFacultyAuditLog({
      req,
      action: "PROFESSOR_ACCOUNT_DELETE",
      severity: "WARN",
      message: `${roleLabel} (${actorId}) deleted professor account ${getProfessorLabel(profRows[0])}.`,
    });

    res.json({ success: true, message: "Professor deleted successfully" });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Professor delete error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete professor",
      details: err.message,
    });
  } finally {
    if (conn) conn.release();
  }
});


router.post("/import_professors", CanCreate, async (req, res) => {
  const { professors } = req.body;

  let conn;

  try {
    if (!Array.isArray(professors) || professors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No professors to import",
      });
    }

    conn = await db3.getConnection();
    await conn.beginTransaction();

    const [existingRows] = await conn.query(
      `SELECT email, employee_id FROM prof_table`
    );

    const existingEmails = new Set(
      existingRows
        .map((e) => normalizeImportText(e.email).toLowerCase())
        .filter(Boolean)
    );
    const existingEmpIds = new Set(
      existingRows
        .map((e) => normalizeImportText(e.employee_id).toLowerCase())
        .filter(Boolean)
    );

    const [departmentRows] = await conn.query(
      `SELECT dprtmnt_id, dprtmnt_code, dprtmnt_name FROM dprtmnt_table`
    );
    const departmentByKey = new Map();
    departmentRows.forEach((department) => {
      [
        department.dprtmnt_id,
        department.dprtmnt_code,
        department.dprtmnt_name,
      ].forEach((value) => {
        const key = normalizeImportText(value).toLowerCase();
        if (key) departmentByKey.set(key, department.dprtmnt_id);
      });
    });

    const values = [];
    const imported = [];
    const skipped = [];

    for (const prof of professors) {
      const employee_id = normalizeImportText(prof.employeeNumber || prof.employee_id);
      const fname = normalizeImportText(prof.firstName || prof.fname);
      const mname = normalizeImportText(prof.middleName || prof.mname);
      const lname = normalizeImportText(prof.lastName || prof.lname);
      const email = normalizeImportText(prof.email);
      const departmentKey = normalizeImportText(
        prof.departmentId || prof.dprtmnt_id || prof.departmentCode || prof.departmentName
      ).toLowerCase();
      const dprtmnt_id = departmentKey ? departmentByKey.get(departmentKey) : null;
      const employeeKey = employee_id.toLowerCase();
      const emailKey = email.toLowerCase();

      if (!employee_id || !fname || !lname || !email) {
        skipped.push({ employee_id, email, reason: "Missing fields" });
        continue;
      }

      if (existingEmails.has(emailKey) || existingEmpIds.has(employeeKey)) {
        skipped.push({ employee_id, email, reason: "Duplicate" });
        continue;
      }

      if (departmentKey && !dprtmnt_id) {
        skipped.push({
          employee_id,
          email,
          reason: `Department not found: ${departmentKey}`,
        });
        continue;
      }

      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      values.push([
        employee_id,
        fname,
        mname,
        lname,
        email,
        hashedPassword,
        1,         // status
        "faculty", // role
        0,         // totp_enabled — disabled until first login
        1          // force_password_change
      ]);

      imported.push({ employee_id, email, password: temporaryPassword, dprtmnt_id });
    }

    if (values.length > 0) {
      // REPLACE WITH:
      await conn.query(
        `INSERT INTO prof_table 
  (employee_id, fname, mname, lname, email, password, status, role, totp_enabled, force_password_change)
  VALUES ?`,
        [values]
      );

      const importedEmployeeIds = imported.map((prof) => prof.employee_id);
      const [insertedProfessors] = await conn.query(
        `SELECT prof_id, employee_id FROM prof_table WHERE employee_id IN (?)`,
        [importedEmployeeIds]
      );
      const professorIdByEmployeeId = new Map(
        insertedProfessors.map((prof) => [prof.employee_id, prof.prof_id])
      );
      const departmentValues = imported
        .filter((prof) => prof.dprtmnt_id)
        .map((prof) => [
          prof.dprtmnt_id,
          professorIdByEmployeeId.get(prof.employee_id),
        ])
        .filter(([, profId]) => profId);

      if (departmentValues.length > 0) {
        await conn.query(
          `INSERT INTO dprtmnt_profs_table (dprtmnt_id, prof_id) VALUES ?`,
          [departmentValues]
        );
      }
    }

    await conn.commit();

    const { actorId, actorRole } = getAuditActor(req);
    const roleLabel = formatAuditActorRole(actorRole);
    await insertFacultyAuditLog({
      req,
      action: "PROFESSOR_ACCOUNT_IMPORT",
      message: `${roleLabel} (${actorId}) imported ${imported.length} professor account(s). Skipped row(s): ${skipped.length}.`,
    });

    res.json({
      success: true,
      importedCount: imported.length,
      skippedCount: skipped.length,
      imported,
      skipped,
    });

  } catch (error) {
    if (conn) await conn.rollback();
    console.error("IMPORT ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Import failed",
      error: error.message,
    });
  } finally {
    if (conn) conn.release();
  }
});


// ─── Faculty: Password Reset Reminder ───────────────────────────────────────
router.post("/send_faculty_password_reminder", async (req, res) => {
  const { employee_id, email, password } = req.body;

  let conn;

  try {
    if (!employee_id || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    conn = await db3.getConnection();

    const [prof] = await conn.query(
      `SELECT fname, mname, lname, employee_id
       FROM prof_table
       WHERE employee_id = ?`,
      [employee_id]
    );

    if (prof.length === 0) {
      return res.json({ success: false, message: "Professor not found" });
    }

    const [companyRows] = await db.query(`
      SELECT company_name, short_term FROM company_settings LIMIT 1
    `);

    const company_name = companyRows[0]?.company_name || "Company";
    const short_term = companyRows[0]?.short_term || "System";
    const frontendUrl = process.env.FRONTEND_URL;

    const { fname, mname, lname, employee_id: empId } = prof[0];
    const fullName = `${lname}, ${fname} ${mname || ""}`.trim();

    await transporter.sendMail({
      from: `"${short_term} — Password Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `${short_term} — Action Required: Change Your Password`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #222;">
          <h2 style="margin-bottom: 4px;">${company_name} Faculty Portal</h2>
          <p style="color: #777; margin-top: 0; font-size: 13px;">Password change reminder</p>

          <p>Hello <strong>${fullName}</strong>,</p>

          <p style="color: #555;">
            This is a reminder that your account is currently using a
            <strong style="color: #222;">temporary password</strong>.
            For the security of your account, you are required to update
            your password as soon as possible.
          </p>

          <table style="background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px;
                         width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 12px 16px; font-weight: bold; font-size: 14px;"
                  colspan="2">Account details</td>
            </tr>
            <tr>
              <td style="padding: 6px 16px; color: #777; width: 40%; font-size: 13px;">Username</td>
              <td style="padding: 6px 16px; font-size: 13px;">
                ${email} / ${empId}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 16px; color: #777; font-size: 13px;">Temporary password</td>
              <td style="padding: 6px 16px; font-family: monospace; font-size: 13px;">${password}</td>
            </tr>
            <tr>
              <td style="padding: 6px 16px; color: #777; font-size: 13px;">Account type</td>
              <td style="padding: 6px 16px; font-size: 13px;">Faculty</td>
            </tr>
            <tr>
              <td style="padding: 6px 16px; color: #777; font-size: 13px;">Status</td>
              <td style="padding: 6px 16px; font-size: 13px;">
                <span style="background: #fff8e1; color: #856404; font-size: 12px;
                              padding: 2px 10px; border-radius: 4px;">
                  Requires password change
                </span>
              </td>
            </tr>
          </table>

          <p style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">
            Steps to change your password
          </p>
          <ol style="color: #555; font-size: 13px; line-height: 2;">
            <li>Go to the login page using the link below</li>
            <li>Log in with your username and temporary password</li>
            <li>You will be prompted to set a new password immediately</li>
            <li>Choose a strong password (min. 8 characters, with letters, numbers, and symbols)</li>
          </ol>

          <div style="border-left: 3px solid #dc3545; padding-left: 12px; margin: 16px 0;">
            <p style="color: #dc3545; font-size: 13px; margin: 0; line-height: 1.6;">
              Do not share your password with anyone. This system will never ask
              for your password via email or phone.
            </p>
          </div>

          <p style="font-size: 13px;">
            Login link:<br/>
            <a href="${frontendUrl}/login" style="color: #0d6efd;">${frontendUrl}/login</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #aaa;">
            If you did not request this or believe this was sent in error, please
            contact the system administrator immediately. Do not reply to this email.
          </p>
        </div>
      `
    });

    res.json({ success: true, message: "Faculty password reset reminder sent" });

  } catch (error) {
    console.error("EMAIL ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
