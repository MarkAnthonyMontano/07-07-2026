import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import {
  Button,
  Box,
  Container,
  Typography,
  Card,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { motion } from "framer-motion";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Snackbar, Alert } from "@mui/material";
import useStudentEditPermissions from "../account_management/useStudentEditPermissions"; // ← NEW

// ─── Shared mobile style tokens ──────────────────────────────────────────────
const S = {
  screen: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    fontFamily: "'Segoe UI', sans-serif",
    paddingBottom: 80,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    margin: "12px 12px 0",
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  cardHeader: {
    color: "#fff",
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  cardBody: { padding: "14px 14px" },
  subHeader: {
    fontSize: 13,
    fontWeight: 700,
    color: "#6D2323",
    marginBottom: 8,
    marginTop: 14,
    paddingBottom: 4,
    borderBottom: "1px solid #e0e0e0",
  },
  fieldWrap: { marginBottom: 14 },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#444",
    marginBottom: 5,
  },
  required: { color: "#d32f2f" },
  input: (hasError) => ({
    width: "100%",
    height: 42,
    padding: "0 12px",
    border: `1px solid ${hasError ? "#d32f2f" : "#ccc"}`,
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: "#fff",
    boxSizing: "border-box",
    outline: "none",
    color: "#222",
  }),
  lockedInput: (hasError) => ({
    width: "100%",
    height: 42,
    padding: "0 12px",
    border: `1px solid ${hasError ? "#d32f2f" : "#ccc"}`,
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: "#f5f5f5",
    boxSizing: "border-box",
    outline: "none",
    color: "#222",
  }),
  select: (hasError) => ({
    width: "100%",
    height: 42,
    padding: "0 12px",
    border: `1px solid ${hasError ? "#d32f2f" : "#ccc"}`,
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: "#fff",
    boxSizing: "border-box",
    outline: "none",
    color: "#222",
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23666' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 32,
  }),
  lockedSelect: (hasError) => ({
    width: "100%",
    height: 42,
    padding: "0 12px",
    border: `1px solid ${hasError ? "#d32f2f" : "#ccc"}`,
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: "#f5f5f5",
    boxSizing: "border-box",
    outline: "none",
    color: "#222",
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23666' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 32,
  }),
  helperError: { color: "#d32f2f", fontSize: 11, marginTop: 3 },
  row: { display: "flex", gap: 10 },
  flex1: { flex: 1 },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    fontSize: 13,
    color: "#333",
    cursor: "pointer",
  },
  checkbox: { width: 18, height: 18, accentColor: "#6D2323", cursor: "pointer" },
  deceasedBanner: {
    backgroundColor: "#FFF3E0",
    border: "1px solid #FFA726",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 12,
    color: "#E65100",
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  // ── NEW: inline locked badge ───────────────────────────────────────────────
  lockedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    marginLeft: 6,
    padding: "1px 6px",
    borderRadius: 4,
    backgroundColor: "#fce4ec",
    color: "#c62828",
    fontSize: 10,
    fontWeight: 700,
    verticalAlign: "middle",
  },
};

const steps = [
  { label: "Personal Information", icon: <PersonIcon /> },
  { label: "Family Background", icon: <FamilyRestroomIcon /> },
  { label: "Educational Attainment", icon: <SchoolIcon /> },
  { label: "Health Medical Records", icon: <HealthAndSafetyIcon /> },
  { label: "Other Information", icon: <InfoIcon /> },
];
const STEP_PATHS = [
  "/student_personal_information",
  "/student_family_background",
  "/student_educational_attainment",
  "/student_health_medical_records",
  "/student_other_information",
];

// ─── Reusable field components ────────────────────────────────────────────────
const Field = ({ label, required, error, helperText, children, lockedBadge }) => (
  <div style={S.fieldWrap}>
    {label && (
      <label style={S.label}>
        {label}
        {required && <span style={S.required}> *</span>}
        {lockedBadge && <span style={S.lockedBadge}>🔒 Locked by Admin</span>}
      </label>
    )}
    {children}
    {error && helperText && <div style={S.helperError}>{helperText}</div>}
  </div>
);

// MInput: pass locked=true to show grey bg and make readOnly
const MInput = ({ error, locked, style, ...props }) => (
  <input
    style={{ ...(locked ? S.lockedInput(error) : S.input(error)), ...style }}
    readOnly={locked || props.readOnly}
    {...props}
  />
);

// MSelect: pass locked=true to show grey bg and disable interaction
const MSelect = ({ error, locked, style, children, ...props }) => (
  <select
    style={{ ...(locked ? S.lockedSelect(error) : S.select(error)), ...style }}
    disabled={locked || props.disabled}
    {...props}
  >
    {children}
  </select>
);

const EXT_OPTIONS = ["Jr.", "Sr.", "I", "II", "III", "IV", "V"];

// ─── Main Component ──────────────────────────────────────────────────────────
const StudentDashboard2Mobile = () => {
  const settings = useContext(SettingsContext);

  // ── Permissions hook — must be at the very top ────────────────────────────
  const { canEdit: canEditField, permissionsLoaded } = useStudentEditPermissions(); // ← NEW

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");

  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState(""); // ← needed for canEdit wrapper

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });
  const [errors, setErrors] = useState({});
  const [soloParentChoice, setSoloParentChoice] = useState("");
  const [activeStep, setActiveStep] = useState(1);

  const [person, setPerson] = useState({
    solo_parent: 0, father_deceased: 0, mother_deceased: 0,
    father_family_name: "", father_given_name: "", father_middle_name: "",
    father_ext: "", father_nickname: "", father_education: 0,
    father_education_level: "", father_last_school: "", father_course: "",
    father_year_graduated: "", father_school_address: "", father_contact: "",
    father_occupation: "", father_employer: "", father_income: "", father_email: "",
    mother_family_name: "", mother_given_name: "", mother_middle_name: "",
    mother_ext: "", mother_nickname: "", mother_education: 0,
    mother_education_level: "", mother_last_school: "", mother_course: "",
    mother_year_graduated: "", mother_school_address: "", mother_contact: "",
    mother_occupation: "", mother_employer: "", mother_income: "", mother_email: "",
    guardian: "", guardian_family_name: "", guardian_given_name: "",
    guardian_middle_name: "", guardian_ext: "", guardian_nickname: "",
    guardian_address: "", guardian_contact: "", guardian_email: "",
    annual_income: "",
  });

  const navigate = useNavigate();
  const location = useLocation();

  // ── canEdit wrapper — mirrors StudentDashboard2 exactly ──────────────────
  const canEdit = (fieldId) => canEditField(fieldId, userRole); // ← NEW

  const showSnackbar = (message, severity = "warning") => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => setSnackbar((p) => ({ ...p, open: false })), 3000);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((p) => ({ ...p, open: false }));
  };

  const docLinks = [
    { label: "ECAT Application Form", to: "/student_ecat_application_form" },
    { label: "Admission Form Process", to: "/student_form_process" },
    { label: "Personal Data Form", to: "/student_personal_data_form" },
    { label: `Application For ${shortTerm?.toUpperCase() || ""} Admission`, to: "/student_office_of_the_registrar" },
    { label: "Admission Services", to: "/student_admission_services" },
  ];

  // ── Settings ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!settings) return;
    if (settings.title_color) setTitleColor(settings.title_color);
    if (settings.subtitle_color) setSubtitleColor(settings.subtitle_color);
    if (settings.border_color) setBorderColor(settings.border_color);
    if (settings.main_button_color) setMainButtonColor(settings.main_button_color);
    if (settings.sub_button_color) setSubButtonColor(settings.sub_button_color);
    if (settings.stepper_color) setStepperColor(settings.stepper_color);
    if (settings.company_name) setCompanyName(settings.company_name);
    if (settings.short_term) setShortTerm(settings.short_term);
  }, [settings]);

  // ── Auth + Person load ────────────────────────────────────────────────────
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const loggedInPersonId = localStorage.getItem("person_id");
    if (!loggedInPersonId) { window.location.href = "/login"; return; }
    setUserRole(storedRole); // ← store role so canEdit() works
    const queryParams = new URLSearchParams(location.search);
    const queryPersonId = queryParams.get("person_id");
    setUserID(queryPersonId || loggedInPersonId);
  }, [location.search]);

  useEffect(() => {
    if (!userID) return;
    axios.get(`${API_BASE_URL}/api/student_data_as_applicant/${userID}`)
      .then((res) => { if (res.data) setPerson(res.data); })
      .catch(console.error);
  }, [userID]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdate = async (updated) => {
    try {
      const { person_id, created_at, current_step, ...clean } = updated;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, clean);
    } catch (err) { console.error("Auto-save failed:", err); }
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    const updated = { ...person, [name]: type === "checkbox" ? (checked ? 1 : 0) : value };
    if (name === "mother_income" || name === "father_income") {
      const m = parseFloat(name === "mother_income" ? value : updated.mother_income) || 0;
      const f = parseFloat(name === "father_income" ? value : updated.father_income) || 0;
      const total = m + f;
      if (total <= 80000) updated.annual_income = "80,000 and below";
      else if (total <= 135000) updated.annual_income = "80,000 to 135,000";
      else if (total <= 250000) updated.annual_income = "135,000 to 250,000";
      else if (total <= 500000) updated.annual_income = "250,000 to 500,000";
      else if (total <= 1000000) updated.annual_income = "500,000 to 1,000,000";
      else updated.annual_income = "1,000,000 and above";
    }
    setPerson(updated);
    handleUpdate(updated);
  };

  const handleGuardianChange = (e) => {
    const { value } = e.target;
    let updated = { ...person, guardian: value };
    if (value === "Father") {
      updated = { ...updated, guardian_family_name: person.father_family_name || "", guardian_given_name: person.father_given_name || "", guardian_middle_name: person.father_middle_name || "", guardian_ext: person.father_ext || "", guardian_nickname: person.father_nickname || "", guardian_contact: person.father_contact || "", guardian_email: person.father_email || "" };
    }
    if (value === "Mother") {
      updated = { ...updated, guardian_family_name: person.mother_family_name || "", guardian_given_name: person.mother_given_name || "", guardian_middle_name: person.mother_middle_name || "", guardian_ext: person.mother_ext || "", guardian_nickname: person.mother_nickname || "", guardian_contact: person.mother_contact || "", guardian_email: person.mother_email || "" };
    }
    setPerson(updated);
    handleUpdate(updated);
  };

  const isFormValid = () => {
    const required = [];
    if (person.father_deceased !== 1) {
      required.push("father_family_name", "father_given_name", "father_contact", "father_occupation", "father_employer", "father_income");
      if (person.father_education !== 1) required.push("father_education_level", "father_last_school", "father_course", "father_year_graduated", "father_school_address");
    }
    if (person.mother_deceased !== 1) {
      required.push("mother_family_name", "mother_given_name", "mother_contact", "mother_occupation", "mother_employer", "mother_income");
      if (person.mother_education !== 1) required.push("mother_education_level", "mother_last_school", "mother_course", "mother_year_graduated", "mother_school_address");
    }
    required.push("guardian", "guardian_family_name", "guardian_given_name", "guardian_address", "guardian_contact", "annual_income");
    const newErrors = {};
    required.forEach((f) => { if (!person[f]?.toString().trim()) newErrors[f] = true; });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStepClick = (index) => {
    if (isFormValid()) {
      showSnackbar("Your record has been saved successfully!", "success");
      setTimeout(() => { setActiveStep(index); navigate(STEP_PATHS[index]); }, 1000);
    } else {
      showSnackbar("Please fill all required fields before proceeding.", "error");
    }
  };

  const isFatherDeceased = person.father_deceased === 1;
  const isMotherDeceased = person.mother_deceased === 1;

  // 🔒 Disable right-click
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // 🔒 Block DevTools shortcuts + Ctrl+P silently
  document.addEventListener("keydown", (e) => {
    const isBlockedKey =
      e.key === "F12" ||
      e.key === "F11" ||
      (e.ctrlKey &&
        e.shiftKey &&
        (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
      (e.ctrlKey && e.key.toLowerCase() === "u") ||
      (e.ctrlKey && e.key.toLowerCase() === "p");

    if (isBlockedKey) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={S.screen}>
      <Snackbar open={snackbar.open} autoHideDuration={1000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 1, padding: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: { xs: "22px", sm: "28px", md: "36px" } }}>
          FAMILY BACKGROUND
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

      {/* Notice */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mx: "12px", mt: "12px", p: "10px 12px", borderRadius: "8px", backgroundColor: "#fffaf5", border: "1px solid #6D2323", boxShadow: "0px 2px 8px rgba(0,0,0,0.05)" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#800000", borderRadius: "6px", width: 36, height: 36, flexShrink: 0 }}>
          <ErrorIcon sx={{ color: "white", fontSize: 22 }} />
        </Box>
        <Typography sx={{ fontSize: 12, color: "#3e3e3e", lineHeight: 1.6 }}>
          <strong style={{ color: "maroon" }}>Notice:</strong>{" "}
          <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>{" "}
          Kindly type 'NA' in boxes where there are no possible answers to the
          information being requested. &nbsp; &nbsp; <br />
          <strong></strong>{" "}
          <span
            style={{
              fontSize: "1.2em",
              margin: "0 15px",
              marginLeft: "100px",
            }}
          >
            ➔
          </span>{" "}
          To make use of the letter 'Ñ', please press ALT while typing "165",
          while for 'ñ', please press ALT while typing "164"
        </Typography>
      </Box>

      {/* Printable Documents */}
      <Box sx={{ px: "12px", pt: "12px" }}>
        <Typography sx={{ fontSize: "30px", fontWeight: "bold", textAlign: "center", color: "black", marginTop: "25px", mb: 2 }}>
          PRINTABLE DOCUMENTS
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
          {docLinks.map((d, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.3 }} style={{ width: "calc(50% - 4px)" }}>
              <Card
                sx={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 0.75, px: 1.5, py: 1.25, height: 52, width: "100%", borderRadius: "12px", border: `1px solid ${borderColor || "#6D2323"}`, backgroundColor: "#fff", cursor: "pointer", transition: "all 0.25s ease-in-out", "&:hover": { backgroundColor: settings?.header_color || "#6D2323", "& .chip-icon": { color: "#fff" }, "& .chip-text": { color: "#fff" } } }}
                onClick={() => navigate(d.to)}
              >
                <PictureAsPdfIcon className="chip-icon" sx={{ fontSize: 18, color: mainButtonColor || "#6D2323", flexShrink: 0 }} />
                <Typography className="chip-text" sx={{ fontSize: 11, fontWeight: 600, color: mainButtonColor || "#6D2323", fontFamily: "Poppins, sans-serif", whiteSpace: "normal", lineHeight: 1.3, textAlign: "center" }}>
                  {d.label}
                </Typography>
              </Card>
            </motion.div>
          ))}
        </Box>
      </Box>

      {/* Intro */}
      <div style={{ padding: "16px 14px 0", textAlign: "center" }}>
        <Container>
          <h1 style={{ fontSize: "32px", fontWeight: "bold", textAlign: "center", color: subtitleColor, marginTop: "25px" }}>
            STUDENT FORM
          </h1>
          <div style={{ textAlign: "center" }}>
            Please update your personal information to keep your student records accurate and up to date for the upcoming academic year at{" "}
            {shortTerm ? <><strong>{shortTerm.toUpperCase()}</strong> - {companyName || ""}</> : companyName || ""}.
          </div>
        </Container>
      </div>

      {/* Stepper */}
      <Box sx={{ display: "flex", justifyContent: "center", width: "100%", px: 2, py: 1.5, borderBottom: "1px solid #e0e0e0" }}>
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }} onClick={() => handleStepClick(index)}>
              <Box sx={{ width: 46, height: 46, borderRadius: "50%", border: `2px solid ${borderColor}`, backgroundColor: activeStep === index ? (settings?.header_color || "#6D2323") : "#E8C999", color: activeStep === index ? "#fff" : "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transition: "all 0.2s" }}>
                {step.icon}
              </Box>
              <Typography sx={{ mt: 0.75, color: activeStep === index ? "#6D2323" : "#555", fontWeight: activeStep === index ? 700 : 400, fontSize: { xs: 10, sm: 12 }, textAlign: "center", maxWidth: 72, lineHeight: 1.3 }}>
                {step.label}
              </Typography>
            </Box>
            {index < steps.length - 1 && (
              <Box sx={{ height: "2px", backgroundColor: mainButtonColor, flex: 1, alignSelf: "center", mx: 1, mb: 3 }} />
            )}
          </React.Fragment>
        ))}
      </Box>

      {/* ── Solo Parent ───────────────────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>Family Information</div>
        <div style={S.cardBody}>

          {/* solo_parent — admin-controlled */}
          <label style={S.checkRow}>
            <input
              type="checkbox"
              style={S.checkbox}
              checked={person.solo_parent === 1}
              onChange={canEdit("solo_parent") ? (e) => {
                const checked = e.target.checked;
                const updated = { ...person, solo_parent: checked ? 1 : 0 };
                if (!checked) { updated.father_deceased = 0; updated.mother_deceased = 0; }
                setPerson(updated);
                handleUpdate(updated);
              } : undefined}
              disabled={!canEdit("solo_parent")}
            />
            Solo Parent
            {!canEdit("solo_parent") && <span style={S.lockedBadge}>🔒 Locked by Admin</span>}
          </label>

          {person.solo_parent === 1 && (
            <Field label="Solo Parent Type">
              <MSelect
                value={soloParentChoice}
                locked={!canEdit("solo_parent")}
                onChange={canEdit("solo_parent") ? (e) => {
                  const choice = e.target.value;
                  setSoloParentChoice(choice);
                  const updated = { ...person, father_deceased: choice === "Mother" ? 1 : 0, mother_deceased: choice === "Father" ? 1 : 0 };
                  setPerson(updated);
                  handleUpdate(updated);
                } : undefined}
              >
                <option value="">Select...</option>
                <option value="Father">Father (Mother is solo parent)</option>
                <option value="Mother">Mother (Father is solo parent)</option>
              </MSelect>
            </Field>
          )}
        </div>
      </div>

      {/* ── Father's Details ──────────────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>Father's Details</div>
        <div style={S.cardBody}>
          <label style={S.checkRow}>
            <input
              type="checkbox"
              style={S.checkbox}
              checked={person.father_deceased === 1}
              onChange={(e) => {
                const checked = e.target.checked;
                const updated = { ...person, father_deceased: checked ? 1 : 0 };
                setPerson(updated);
                handleUpdate(updated);
              }}
            />
            Father Separated / Deceased
          </label>

          {isFatherDeceased ? (
            <div style={S.deceasedBanner}>⚠️ Father marked as separated/deceased. Fields hidden.</div>
          ) : (
            <>
              {/* Name row */}
              <div style={S.row}>
                {/* father_family_name — system-locked */}
                <div style={S.flex1}>
                  <Field label="Last Name" required error={errors.father_family_name} helperText="Required">
                    <MInput locked name="father_family_name" value={(person.father_family_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "father_family_name", value: e.target.value.toUpperCase() } })} error={errors.father_family_name} placeholder="Father Last Name" />
                  </Field>
                </div>
                {/* father_given_name — system-locked */}
                <div style={S.flex1}>
                  <Field label="First Name" required error={errors.father_given_name} helperText="Required">
                    <MInput locked name="father_given_name" value={(person.father_given_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "father_given_name", value: e.target.value.toUpperCase() } })} error={errors.father_given_name} placeholder="Father First Name" />
                  </Field>
                </div>
              </div>

              <div style={S.row}>
                {/* father_middle_name — system-locked */}
                <div style={S.flex1}>
                  <Field label="Middle Name">
                    <MInput locked name="father_middle_name" value={(person.father_middle_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "father_middle_name", value: e.target.value.toUpperCase() } })} placeholder="Father Middle Name" />
                  </Field>
                </div>
                {/* father_ext — admin-controlled */}
                <div style={{ width: 120 }}>
                  <Field label="Extension" lockedBadge={!canEdit("father_ext")}>
                    <MSelect
                      name="father_ext"
                      value={person.father_ext || ""}
                      onChange={canEdit("father_ext") ? handleChange : undefined}
                      locked={!canEdit("father_ext")}
                    >
                      <option value="">None</option>
                      {EXT_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                    </MSelect>
                  </Field>
                </div>
              </div>

              {/* father_nickname — admin-controlled */}
              <Field label="Nickname" lockedBadge={!canEdit("father_nickname")}>
                <MInput
                  name="father_nickname"
                  value={person.father_nickname || ""}
                  onChange={canEdit("father_nickname") ? handleChange : undefined}
                  locked={!canEdit("father_nickname")}
                  placeholder="Father Nickname"
                />
              </Field>

              {/* ── Father Education ──────────────────────────────────── */}
              <div style={S.subHeader}>Father's Educational Background</div>
              <label style={S.checkRow}>
                <input
                  type="checkbox"
                  style={S.checkbox}
                  checked={person.father_education === 1}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const updated = { ...person, father_education: checked ? 1 : 0, ...(checked ? { father_education_level: "", father_last_school: "", father_course: "", father_year_graduated: "", father_school_address: "" } : {}) };
                    setPerson(updated);
                    handleUpdate(updated);
                  }}
                />
                Father's education not applicable
              </label>

              {person.father_education !== 1 && (
                <>
                  {/* father_education_level — admin-controlled */}
                  <Field label="Education Level" required error={errors.father_education_level} helperText="Required" lockedBadge={!canEdit("father_education_level")}>
                    <MInput
                      name="father_education_level"
                      value={person.father_education_level || ""}
                      onChange={canEdit("father_education_level") ? handleChange : undefined}
                      locked={!canEdit("father_education_level")}
                      error={errors.father_education_level}
                      placeholder="Father Education Level"
                    />
                  </Field>

                  <div style={S.row}>
                    {/* father_last_school — admin-controlled */}
                    <div style={S.flex1}>
                      <Field label="Last School" required error={errors.father_last_school} helperText="Required" lockedBadge={!canEdit("father_last_school")}>
                        <MInput
                          name="father_last_school"
                          value={person.father_last_school || ""}
                          onChange={canEdit("father_last_school") ? handleChange : undefined}
                          locked={!canEdit("father_last_school")}
                          error={errors.father_last_school}
                          placeholder="Last School Attended"
                        />
                      </Field>
                    </div>
                    {/* father_course — admin-controlled */}
                    <div style={S.flex1}>
                      <Field label="Course" required error={errors.father_course} helperText="Required" lockedBadge={!canEdit("father_course")}>
                        <MInput
                          name="father_course"
                          value={person.father_course || ""}
                          onChange={canEdit("father_course") ? handleChange : undefined}
                          locked={!canEdit("father_course")}
                          error={errors.father_course}
                          placeholder="Course"
                        />
                      </Field>
                    </div>
                  </div>

                  <div style={S.row}>
                    {/* father_year_graduated — admin-controlled */}
                    <div style={S.flex1}>
                      <Field label="Year Graduated" required error={errors.father_year_graduated} helperText="Required" lockedBadge={!canEdit("father_year_graduated")}>
                        <MInput
                          type="number"
                          name="father_year_graduated"
                          value={person.father_year_graduated || ""}
                          onChange={canEdit("father_year_graduated") ? handleChange : undefined}
                          locked={!canEdit("father_year_graduated")}
                          error={errors.father_year_graduated}
                          placeholder="Year Graduated"
                        />
                      </Field>
                    </div>
                    {/* father_school_address — admin-controlled */}
                    <div style={S.flex1}>
                      <Field label="School Address" required error={errors.father_school_address} helperText="Required" lockedBadge={!canEdit("father_school_address")}>
                        <MInput
                          name="father_school_address"
                          value={person.father_school_address || ""}
                          onChange={canEdit("father_school_address") ? handleChange : undefined}
                          locked={!canEdit("father_school_address")}
                          error={errors.father_school_address}
                          placeholder="School Address"
                        />
                      </Field>
                    </div>
                  </div>
                </>
              )}

              {/* ── Father Contact ────────────────────────────────────── */}
              <div style={S.subHeader}>Father's Contact Information</div>

              <div style={S.row}>
                {/* father_contact — admin-controlled */}
                <div style={S.flex1}>
                  <Field label="Contact Number" required error={errors.father_contact} helperText="Required" lockedBadge={!canEdit("father_contact")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>+63</span>
                      <MInput
                        name="father_contact"
                        value={person.father_contact || ""}
                        onChange={canEdit("father_contact") ? (e) => handleChange({ target: { name: "father_contact", value: e.target.value.replace(/\D/g, "") } }) : undefined}
                        locked={!canEdit("father_contact")}
                        error={errors.father_contact}
                        placeholder="9XXXXXXXXX"
                        maxLength={10}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </Field>
                </div>
                {/* father_occupation — admin-controlled */}
                <div style={S.flex1}>
                  <Field label="Occupation" required error={errors.father_occupation} helperText="Required" lockedBadge={!canEdit("father_occupation")}>
                    <MInput
                      name="father_occupation"
                      value={person.father_occupation || ""}
                      onChange={canEdit("father_occupation") ? handleChange : undefined}
                      locked={!canEdit("father_occupation")}
                      error={errors.father_occupation}
                      placeholder="Occupation"
                    />
                  </Field>
                </div>
              </div>

              <div style={S.row}>
                {/* father_employer — admin-controlled */}
                <div style={S.flex1}>
                  <Field label="Employer" required error={errors.father_employer} helperText="Required" lockedBadge={!canEdit("father_employer")}>
                    <MInput
                      name="father_employer"
                      value={person.father_employer || ""}
                      onChange={canEdit("father_employer") ? handleChange : undefined}
                      locked={!canEdit("father_employer")}
                      error={errors.father_employer}
                      placeholder="Employer"
                    />
                  </Field>
                </div>
                {/* father_income — admin-controlled */}
                <div style={S.flex1}>
                  <Field label="Monthly Income" required error={errors.father_income} helperText="Required" lockedBadge={!canEdit("father_income")}>
                    <MInput
                      type="number"
                      name="father_income"
                      value={person.father_income || ""}
                      onChange={canEdit("father_income") ? (e) => handleChange({ target: { name: "father_income", value: e.target.value.replace(/\D/g, "") } }) : undefined}
                      locked={!canEdit("father_income")}
                      error={errors.father_income}
                      placeholder="Monthly Income"
                    />
                  </Field>
                </div>
              </div>

              {/* father_email — admin-controlled */}
              <Field label="Email Address" lockedBadge={!canEdit("father_email")}>
                <MInput
                  type="email"
                  name="father_email"
                  value={person.father_email || ""}
                  onChange={canEdit("father_email") ? handleChange : undefined}
                  locked={!canEdit("father_email")}
                  placeholder="Father Email Address"
                />
              </Field>
            </>
          )}
        </div>
      </div>

      {/* ── Mother's Details ──────────────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>Mother's Details</div>
        <div style={S.cardBody}>
          <label style={S.checkRow}>
            <input
              type="checkbox"
              style={S.checkbox}
              checked={person.mother_deceased === 1}
              onChange={(e) => {
                const checked = e.target.checked;
                const updated = { ...person, mother_deceased: checked ? 1 : 0 };
                setPerson(updated);
                handleUpdate(updated);
              }}
            />
            Mother Separated / Deceased
          </label>

          {isMotherDeceased ? (
            <div style={S.deceasedBanner}>⚠️ Mother marked as separated/deceased. Fields hidden.</div>
          ) : (
            <>
              {/* Name row */}
              <div style={S.row}>
                {/* mother_family_name — system-locked */}
                <div style={S.flex1}>
                  <Field label="Last Name" required error={errors.mother_family_name} helperText="Required">
                    <MInput locked name="mother_family_name" value={(person.mother_family_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "mother_family_name", value: e.target.value.toUpperCase() } })} error={errors.mother_family_name} placeholder="Mother Last Name" />
                  </Field>
                </div>
                {/* mother_given_name — system-locked */}
                <div style={S.flex1}>
                  <Field label="First Name" required error={errors.mother_given_name} helperText="Required">
                    <MInput locked name="mother_given_name" value={(person.mother_given_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "mother_given_name", value: e.target.value.toUpperCase() } })} error={errors.mother_given_name} placeholder="Mother First Name" />
                  </Field>
                </div>
              </div>

              <div style={S.row}>
                {/* mother_middle_name — system-locked */}
                <div style={S.flex1}>
                  <Field label="Middle Name">
                    <MInput locked name="mother_middle_name" value={(person.mother_middle_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "mother_middle_name", value: e.target.value.toUpperCase() } })} placeholder="Mother Middle Name" />
                  </Field>
                </div>
                {/* mother_ext — admin-controlled */}
                <div style={{ width: 120 }}>
                  <Field label="Extension" lockedBadge={!canEdit("mother_ext")}>
                    <MSelect
                      name="mother_ext"
                      value={person.mother_ext || ""}
                      onChange={canEdit("mother_ext") ? handleChange : undefined}
                      locked={!canEdit("mother_ext")}
                    >
                      <option value="">None</option>
                      {EXT_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                    </MSelect>
                  </Field>
                </div>
              </div>

              {/* mother_nickname — admin-controlled */}
              <Field label="Nickname" lockedBadge={!canEdit("mother_nickname")}>
                <MInput
                  name="mother_nickname"
                  value={person.mother_nickname || ""}
                  onChange={canEdit("mother_nickname") ? handleChange : undefined}
                  locked={!canEdit("mother_nickname")}
                  placeholder="Mother Nickname"
                />
              </Field>

              {/* ── Mother Education ──────────────────────────────────── */}
              <div style={S.subHeader}>Mother's Educational Background</div>
              <label style={S.checkRow}>
                <input
                  type="checkbox"
                  style={S.checkbox}
                  checked={person.mother_education === 1}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const updated = { ...person, mother_education: checked ? 1 : 0, ...(checked ? { mother_education_level: "", mother_last_school: "", mother_course: "", mother_year_graduated: "", mother_school_address: "" } : {}) };
                    setPerson(updated);
                    handleUpdate(updated);
                  }}
                />
                Mother's education not applicable
              </label>

              {person.mother_education !== 1 && (
                <>
                  {/* mother_education_level — admin-controlled */}
                  <Field label="Education Level" required error={errors.mother_education_level} helperText="Required" lockedBadge={!canEdit("mother_education_level")}>
                    <MInput
                      name="mother_education_level"
                      value={person.mother_education_level || ""}
                      onChange={canEdit("mother_education_level") ? handleChange : undefined}
                      locked={!canEdit("mother_education_level")}
                      error={errors.mother_education_level}
                      placeholder="Mother Education Level"
                    />
                  </Field>

                  <div style={S.row}>
                    {/* mother_last_school — admin-controlled */}
                    <div style={S.flex1}>
                      <Field label="Last School" required error={errors.mother_last_school} helperText="Required" lockedBadge={!canEdit("mother_last_school")}>
                        <MInput
                          name="mother_last_school"
                          value={person.mother_last_school || ""}
                          onChange={canEdit("mother_last_school") ? handleChange : undefined}
                          locked={!canEdit("mother_last_school")}
                          error={errors.mother_last_school}
                          placeholder="Last School Attended"
                        />
                      </Field>
                    </div>
                    {/* mother_course — admin-controlled */}
                    <div style={S.flex1}>
                      <Field label="Course" required error={errors.mother_course} helperText="Required" lockedBadge={!canEdit("mother_course")}>
                        <MInput
                          name="mother_course"
                          value={person.mother_course || ""}
                          onChange={canEdit("mother_course") ? handleChange : undefined}
                          locked={!canEdit("mother_course")}
                          error={errors.mother_course}
                          placeholder="Course"
                        />
                      </Field>
                    </div>
                  </div>

                  <div style={S.row}>
                    {/* mother_year_graduated — admin-controlled */}
                    <div style={S.flex1}>
                      <Field label="Year Graduated" required error={errors.mother_year_graduated} helperText="Required" lockedBadge={!canEdit("mother_year_graduated")}>
                        <MInput
                          type="number"
                          name="mother_year_graduated"
                          value={person.mother_year_graduated || ""}
                          onChange={canEdit("mother_year_graduated") ? handleChange : undefined}
                          locked={!canEdit("mother_year_graduated")}
                          error={errors.mother_year_graduated}
                          placeholder="Year Graduated"
                        />
                      </Field>
                    </div>
                    {/* mother_school_address — admin-controlled */}
                    <div style={S.flex1}>
                      <Field label="School Address" required error={errors.mother_school_address} helperText="Required" lockedBadge={!canEdit("mother_school_address")}>
                        <MInput
                          name="mother_school_address"
                          value={person.mother_school_address || ""}
                          onChange={canEdit("mother_school_address") ? handleChange : undefined}
                          locked={!canEdit("mother_school_address")}
                          error={errors.mother_school_address}
                          placeholder="School Address"
                        />
                      </Field>
                    </div>
                  </div>
                </>
              )}

              {/* ── Mother Contact ────────────────────────────────────── */}
              <div style={S.subHeader}>Mother's Contact Information</div>

              <div style={S.row}>
                {/* mother_contact — admin-controlled */}
                <div style={S.flex1}>
                  <Field label="Contact Number" required error={errors.mother_contact} helperText="Required" lockedBadge={!canEdit("mother_contact")}>
                    <MInput
                      name="mother_contact"
                      value={person.mother_contact || ""}
                      onChange={canEdit("mother_contact") ? (e) => handleChange({ target: { name: "mother_contact", value: e.target.value.replace(/\D/g, "") } }) : undefined}
                      locked={!canEdit("mother_contact")}
                      error={errors.mother_contact}
                      placeholder="9XXXXXXXXX"
                    />
                  </Field>
                </div>
                {/* mother_occupation — admin-controlled */}
                <div style={S.flex1}>
                  <Field label="Occupation" required error={errors.mother_occupation} helperText="Required" lockedBadge={!canEdit("mother_occupation")}>
                    <MInput
                      name="mother_occupation"
                      value={person.mother_occupation || ""}
                      onChange={canEdit("mother_occupation") ? handleChange : undefined}
                      locked={!canEdit("mother_occupation")}
                      error={errors.mother_occupation}
                      placeholder="Occupation"
                    />
                  </Field>
                </div>
              </div>

              <div style={S.row}>
                {/* mother_employer — admin-controlled */}
                <div style={S.flex1}>
                  <Field label="Employer" required error={errors.mother_employer} helperText="Required" lockedBadge={!canEdit("mother_employer")}>
                    <MInput
                      name="mother_employer"
                      value={person.mother_employer || ""}
                      onChange={canEdit("mother_employer") ? handleChange : undefined}
                      locked={!canEdit("mother_employer")}
                      error={errors.mother_employer}
                      placeholder="Employer"
                    />
                  </Field>
                </div>
                {/* mother_income — admin-controlled */}
                <div style={S.flex1}>
                  <Field label="Monthly Income" required error={errors.mother_income} helperText="Required" lockedBadge={!canEdit("mother_income")}>
                    <MInput
                      type="number"
                      name="mother_income"
                      value={person.mother_income || ""}
                      onChange={canEdit("mother_income") ? (e) => handleChange({ target: { name: "mother_income", value: e.target.value.replace(/\D/g, "") } }) : undefined}
                      locked={!canEdit("mother_income")}
                      error={errors.mother_income}
                      placeholder="Monthly Income"
                    />
                  </Field>
                </div>
              </div>

              {/* mother_email — admin-controlled */}
              <Field label="Email Address" lockedBadge={!canEdit("mother_email")}>
                <MInput
                  type="email"
                  name="mother_email"
                  value={person.mother_email || ""}
                  onChange={canEdit("mother_email") ? handleChange : undefined}
                  locked={!canEdit("mother_email")}
                  placeholder="Mother Email Address"
                />
              </Field>
            </>
          )}
        </div>
      </div>

      {/* ── Guardian / Emergency Contact ─────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>In Case of Emergency — Guardian</div>
        <div style={S.cardBody}>

          {/* guardian — admin-controlled */}
          <Field label="Guardian Relationship" required error={errors.guardian} helperText="This field is required." lockedBadge={!canEdit("guardian")}>
            <MSelect
              name="guardian"
              value={person.guardian || ""}
              onChange={canEdit("guardian") ? handleGuardianChange : undefined}
              locked={!canEdit("guardian")}
              error={errors.guardian}
            >
              <option value="">Select Guardian</option>
              {["Father", "Mother", "Brother/Sister", "Uncle", "Aunt", "StepFather", "StepMother", "Cousin", "Father in Law", "Mother in Law", "Sister in Law", "GrandMother", "GrandFather", "Spouse", "Others"].map((v) => <option key={v} value={v}>{v}</option>)}
            </MSelect>
          </Field>

          <div style={S.row}>
            {/* guardian_family_name — system-locked */}
            <div style={S.flex1}>
              <Field label="Last Name" required error={errors.guardian_family_name} helperText="Required">
                <MInput locked name="guardian_family_name" value={(person.guardian_family_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "guardian_family_name", value: e.target.value.toUpperCase() } })} error={errors.guardian_family_name} placeholder="Guardian Last Name" />
              </Field>
            </div>
            {/* guardian_given_name — system-locked */}
            <div style={S.flex1}>
              <Field label="First Name" required error={errors.guardian_given_name} helperText="Required">
                <MInput locked name="guardian_given_name" value={(person.guardian_given_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "guardian_given_name", value: e.target.value.toUpperCase() } })} error={errors.guardian_given_name} placeholder="Guardian First Name" />
              </Field>
            </div>
          </div>

          <div style={S.row}>
            {/* guardian_middle_name — system-locked */}
            <div style={S.flex1}>
              <Field label="Middle Name">
                <MInput locked name="guardian_middle_name" value={(person.guardian_middle_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "guardian_middle_name", value: e.target.value.toUpperCase() } })} placeholder="Guardian Middle Name" />
              </Field>
            </div>
            {/* guardian_ext — admin-controlled */}
            <div style={{ width: 120 }}>
              <Field label="Extension" lockedBadge={!canEdit("guardian_ext")}>
                <MSelect
                  name="guardian_ext"
                  value={person.guardian_ext || ""}
                  onChange={canEdit("guardian_ext") ? handleChange : undefined}
                  locked={!canEdit("guardian_ext")}
                >
                  <option value="">None</option>
                  {EXT_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                </MSelect>
              </Field>
            </div>
          </div>

          {/* guardian_nickname — admin-controlled */}
          <Field label="Nickname" lockedBadge={!canEdit("guardian_nickname")}>
            <MInput
              name="guardian_nickname"
              value={person.guardian_nickname || ""}
              onChange={canEdit("guardian_nickname") ? handleChange : undefined}
              locked={!canEdit("guardian_nickname")}
              placeholder="Guardian Nickname"
            />
          </Field>

          {/* guardian_address — admin-controlled */}
          <Field label="Complete Address" required error={errors.guardian_address} helperText="This field is required." lockedBadge={!canEdit("guardian_address")}>
            <MInput
              name="guardian_address"
              value={person.guardian_address || ""}
              onChange={canEdit("guardian_address") ? handleChange : undefined}
              locked={!canEdit("guardian_address")}
              error={errors.guardian_address}
              placeholder="Guardian Address"
            />
          </Field>

          <div style={S.row}>
            {/* guardian_contact — admin-controlled */}
            <div style={S.flex1}>
              <Field label="Contact Number" required error={errors.guardian_contact} helperText="Required" lockedBadge={!canEdit("guardian_contact")}>
                <MInput
                  name="guardian_contact"
                  value={person.guardian_contact || ""}
                  onChange={canEdit("guardian_contact") ? (e) => handleChange({ target: { name: "guardian_contact", value: e.target.value.replace(/\D/g, "") } }) : undefined}
                  locked={!canEdit("guardian_contact")}
                  error={errors.guardian_contact}
                  placeholder="9XXXXXXXXX"
                />
              </Field>
            </div>
            {/* guardian_email — admin-controlled */}
            <div style={S.flex1}>
              <Field label="Email Address" lockedBadge={!canEdit("guardian_email")}>
                <MInput
                  type="email"
                  name="guardian_email"
                  value={person.guardian_email || ""}
                  onChange={canEdit("guardian_email") ? handleChange : undefined}
                  locked={!canEdit("guardian_email")}
                  placeholder="Guardian Email Address"
                />
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* ── Annual Income ─────────────────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}`, marginBottom: 2 }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>Family Annual Income</div>
        <div style={S.cardBody}>

          {/* annual_income — admin-controlled */}
          <Field label="Annual Income Bracket" required error={errors.annual_income} helperText="This field is required." lockedBadge={!canEdit("annual_income")}>
            <MSelect
              name="annual_income"
              value={person.annual_income || ""}
              onChange={canEdit("annual_income") ? handleChange : undefined}
              locked={!canEdit("annual_income")}
              error={errors.annual_income}
            >
              <option value="">Select Annual Income</option>
              {["80,000 and below", "80,000 to 135,000", "135,000 to 250,000", "250,000 to 500,000", "500,000 to 1,000,000", "1,000,000 and above"].map((v) => <option key={v} value={v}>{v}</option>)}
            </MSelect>
          </Field>
        </div>

        {/* Bottom Nav */}
        <Box display="flex" justifyContent="space-between" mt={1} mx="12px" mb={3}>
          <Button
            variant="contained"
            onClick={() => {
              handleUpdate(person);
              showSnackbar("Your record has been saved successfully!", "success");
              setTimeout(() => navigate("/student_personal_information"), 1000);
            }}
            startIcon={<ArrowBackIcon sx={{ color: "#000", transition: "color 0.3s" }} />}
            sx={{
              backgroundColor: subButtonColor,
              border: `1px solid ${borderColor}`,
              color: "#000",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { backgroundColor: "#000", color: "#fff", "& .MuiSvgIcon-root": { color: "#fff" } },
            }}
          >
            Previous Step
          </Button>

          <Button
            variant="contained"
            onClick={() => {
              handleUpdate(person);
              if (isFormValid()) {
                showSnackbar("Your record has been saved successfully!", "success");
                setTimeout(() => navigate("/student_educational_attainment"), 1000);
              } else {
                showSnackbar("Please fill all required fields.", "error");
              }
            }}
            endIcon={<ArrowForwardIcon sx={{ color: "#fff", transition: "color 0.3s" }} />}
            sx={{
              backgroundColor: mainButtonColor,
              border: `1px solid ${borderColor}`,
              color: "#fff",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { backgroundColor: "#000", color: "#fff", "& .MuiSvgIcon-root": { color: "#fff" } },
            }}
          >
            Next Step
          </Button>
        </Box>
      </div>
    </div>
  );
};

export default StudentDashboard2Mobile;
