const express = require("express");
const { db3 } = require("../database/database");
const {
  buildStudentHistoryMessage,
  getEmployeeActorFromRequest,
  insertStudentHistoryLog,
} = require("../../utils/studentHistoryLogger");

const router = express.Router();

router.get("/student-history-logs/:student_number", async (req, res) => {
  const studentNumber = String(req.params.student_number || "").trim();

  if (!studentNumber) {
    return res.status(400).json({ message: "Student number is required." });
  }

  try {
    const [[student]] = await db3.query(
      `
      SELECT
        sn.student_number,
        pt.first_name,
        pt.middle_name,
        pt.last_name,
        pt.emailAddress,
        active_sy.id AS active_school_year_id,
        sst.year_level_id,
        ylt.year_level_description,
        sst.active_curriculum AS current_curriculum_id,
        current_program.program_code AS current_program_code,
        current_program.program_description AS current_program_description,
        current_program.major AS current_program_major,
        current_department.dprtmnt_id AS current_department_id,
        current_department.dprtmnt_code AS current_department_code,
        current_department.dprtmnt_name AS current_department_name,
        pt.program AS original_curriculum_id,
        original_program.program_code AS original_program_code,
        original_program.program_description AS original_program_description,
        original_program.major AS original_program_major,
        original_department.dprtmnt_id AS original_department_id,
        original_department.dprtmnt_code AS original_department_code,
        original_department.dprtmnt_name AS original_department_name,
        unifast.id AS unifast_id,
        COALESCE(unifast_scholarship.scholarship_name, 'UNIFAST-FHE') AS unifast_scholarship_name,
        matriculation.id AS matriculation_id,
        matriculation.matriculation_remark,
        matriculation.remark AS matriculation_remark_fallback,
        matriculation_scholarship.scholarship_name AS matriculation_scholarship_name
      FROM student_numbering_table sn
      LEFT JOIN person_table pt
        ON pt.person_id = sn.person_id
      LEFT JOIN active_school_year_table active_sy
        ON active_sy.astatus = 1
      LEFT JOIN student_status_table sst
        ON sst.student_number = sn.student_number
       AND sst.active_school_year_id = active_sy.id
      LEFT JOIN year_level_table ylt
        ON ylt.year_level_id = sst.year_level_id
      LEFT JOIN curriculum_table current_curriculum
        ON current_curriculum.curriculum_id = sst.active_curriculum
      LEFT JOIN program_table current_program
        ON current_program.program_id = current_curriculum.program_id
      LEFT JOIN dprtmnt_curriculum_table current_dct
        ON current_dct.curriculum_id = sst.active_curriculum
      LEFT JOIN dprtmnt_table current_department
        ON current_department.dprtmnt_id = current_dct.dprtmnt_id
      LEFT JOIN curriculum_table original_curriculum
        ON original_curriculum.curriculum_id = pt.program
      LEFT JOIN program_table original_program
        ON original_program.program_id = original_curriculum.program_id
      LEFT JOIN dprtmnt_curriculum_table original_dct
        ON original_dct.curriculum_id = pt.program
      LEFT JOIN dprtmnt_table original_department
        ON original_department.dprtmnt_id = original_dct.dprtmnt_id
      LEFT JOIN unifast
        ON unifast.student_number = sn.student_number
       AND unifast.active_school_year_id = active_sy.id
       AND unifast.status = 1
      LEFT JOIN scholarship_type unifast_scholarship
        ON unifast_scholarship.id = unifast.scholarship_id
      LEFT JOIN matriculation
        ON matriculation.student_number = sn.student_number
       AND matriculation.active_school_year_id = active_sy.id
       AND matriculation.status = 1
       AND unifast.id IS NULL
      LEFT JOIN scholarship_type matriculation_scholarship
        ON matriculation_scholarship.id = matriculation.scholarship_id
      WHERE sn.student_number = ?
      ORDER BY unifast.id DESC, matriculation.id DESC
      LIMIT 1
      `,
      [studentNumber],
    );

    const [rows] = await db3.query(
      `
      SELECT
        shl.id,
        shl.student_number,
        shl.message,
        shl.employee_id,
        shl.created_at,
        ua.employee_id AS employee_code,
        ua.first_name,
        ua.middle_name,
        ua.last_name
      FROM student_history_logs shl
      LEFT JOIN user_accounts ua ON ua.person_id = shl.employee_id
      WHERE shl.student_number = ?
      ORDER BY shl.created_at DESC, shl.id DESC
      `,
      [studentNumber],
    );

    res.json({
      success: true,
      student_number: studentNumber,
      student: student
        ? {
            student_number: student.student_number,
            first_name: student.first_name || "",
            middle_name: student.middle_name || "",
            last_name: student.last_name || "",
            emailAddress: student.emailAddress || "",
            year_level_id: student.year_level_id || null,
            year_level_description: student.year_level_description || "",
            scholarship_discount: student.unifast_id
              ? student.unifast_scholarship_name || "UNIFAST-FHE"
              : student.matriculation_id
                ? student.matriculation_scholarship_name ||
                  student.matriculation_remark ||
                  student.matriculation_remark_fallback ||
                  "MATRICULATION"
                : "MATRICULATION",
            current_curriculum_id: student.current_curriculum_id || null,
            current_curriculum: [
              student.current_program_code ? `(${student.current_program_code})` : "",
              student.current_program_description || "",
              student.current_program_major ? `(${student.current_program_major})` : "",
            ].filter(Boolean).join(" "),
            current_department_id: student.current_department_id || null,
            current_department: [
              student.current_department_code ? `(${student.current_department_code})` : "",
              student.current_department_name || "",
            ].filter(Boolean).join(" "),
            original_curriculum_id: student.original_curriculum_id || null,
            original_curriculum: [
              student.original_program_code ? `(${student.original_program_code})` : "",
              student.original_program_description || "",
              student.original_program_major ? `(${student.original_program_major})` : "",
            ].filter(Boolean).join(" "),
            original_department_id: student.original_department_id || null,
            original_department: [
              student.original_department_code ? `(${student.original_department_code})` : "",
              student.original_department_name || "",
            ].filter(Boolean).join(" "),
          }
        : null,
      logs: rows,
    });
  } catch (error) {
    console.error("Error fetching student history logs:", error);
    res.status(500).json({ message: "Failed to fetch student history logs." });
  }
});

router.post("/student-history-logs", async (req, res) => {
  const studentNumber = String(req.body?.student_number || "").trim();
  const action = String(req.body?.action || "").trim();
  const details = req.body?.details || {};
  const rawMessage = String(req.body?.message || "").trim();

  if (!studentNumber) {
    return res.status(400).json({ message: "Student number is required." });
  }

  try {
    const actor = await getEmployeeActorFromRequest(req);
    const message =
      rawMessage ||
      buildStudentHistoryMessage({
        actor,
        body: {
          action,
          student_number: studentNumber,
          ...details,
        },
      });

    if (!message) {
      return res.status(400).json({ message: "Message or supported action is required." });
    }

    const inserted = await insertStudentHistoryLog({
      studentNumber,
      message,
      employeeId: actor.personId,
    });

    if (!inserted) {
      return res.status(500).json({ message: "Failed to save student history log." });
    }

    res.json({ success: true, message: "Student history log saved." });
  } catch (error) {
    console.error("Error saving student history log:", error);
    res.status(500).json({ message: "Failed to save student history log." });
  }
});

module.exports = router;
