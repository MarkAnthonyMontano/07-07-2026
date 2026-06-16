import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import DateField from "../components/DateField";
import {
  Button,
  Box,
  TextField,
  Container,
  Typography,
  Card,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  FormHelperText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Modal,
  FormControlLabel,
  Checkbox,
  IconButton,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import LockIcon from "@mui/icons-material/Lock";           // ✅ ADDED
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { motion } from "framer-motion";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Snackbar, Alert } from "@mui/material";

// ─────────────────────────────────────────────────────────────────────────────
// ✅ ADDED: Same helper used in the desktop StudentDashboard4.
//   • non-students → always editable
//   • still loading (null) → optimistic editable
//   • otherwise → follow stored permission (false = locked by admin)
// ─────────────────────────────────────────────────────────────────────────────
const canStudentEdit = (permissions, fieldId, userRole) => {
  if (userRole !== "student") return true;
  if (permissions === null) return true;
  return permissions[fieldId] !== false;
};

// ─── Style tokens ─────────────────────────────────────────────────────────────
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
  fieldWrap: { marginBottom: 14 },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#444",
    marginBottom: 5,
  },
  // ✅ UPDATED: accepts locked param for greyed-out styling
  input: (hasError, locked) => ({
    width: "100%",
    height: 42,
    padding: "0 12px",
    border: `1px solid ${hasError ? "#d32f2f" : "#ccc"}`,
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: locked ? "#f5f5f5" : "#fff",
    boxSizing: "border-box",
    outline: "none",
    color: locked ? "#999" : "#222",
    cursor: locked ? "not-allowed" : "text",
  }),
  // ✅ UPDATED: accepts locked param for greyed-out styling
  textarea: (locked) => ({
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ccc",
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: locked ? "#f5f5f5" : "#fff",
    boxSizing: "border-box",
    outline: "none",
    color: locked ? "#999" : "#222",
    cursor: locked ? "not-allowed" : "text",
    resize: locked ? "none" : "vertical",
    minHeight: 80,
    fontFamily: "'Segoe UI', sans-serif",
  }),
  divider: {
    border: "none",
    borderTop: "1px solid #e0e0e0",
    margin: "14px 0 10px",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#6D2323",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  checkLabel: { fontSize: 14, color: "#333" },
  yesNoRow: { display: "flex", gap: 16, alignItems: "center" },
  yesNoItem: { display: "flex", alignItems: "center", gap: 4 },
  conditionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottom: "1px solid #f0f0f0",
    marginBottom: 8,
    paddingBottom: 8,
  },
  conditionLabel: { fontSize: 13, color: "#333", flex: 1 },
  bottomBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTop: "1px solid #e0e0e0",
    padding: "10px 14px",
    display: "flex",
    gap: 10,
    zIndex: 200,
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

// ─── ✅ ADDED: Locked badge — shown inline next to field labels ───────────────
const LockedBadge = () => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      marginLeft: 6,
      padding: "1px 6px",
      borderRadius: 4,
      backgroundColor: "#fce4ec",
      color: "#c62828",
      fontSize: 10,
      fontWeight: "bold",
      verticalAlign: "middle",
    }}
  >
    <LockIcon style={{ fontSize: 10 }} />
    Locked by Admin
  </span>
);

// ─── Reusable field wrapper ───────────────────────────────────────────────────
const Field = ({ label, locked, children }) => (
  <div style={S.fieldWrap}>
    {label && (
      <label style={S.label}>
        {label}
        {locked && <LockedBadge />}   {/* ✅ ADDED */}
      </label>
    )}
    {children}
  </div>
);

// ─── YES / NO toggle ──────────────────────────────────────────────────────────
// ✅ UPDATED: disabled prop now driven by permission, not hardcoded true
const YesNo = ({ fieldKey, person, onChange, disabled }) => (
  <div style={S.yesNoRow}>
    <div style={S.yesNoItem}>
      <input
        type="checkbox"
        disabled={disabled}
        checked={person[fieldKey] === 1}
        onChange={() => { if (!disabled) onChange(fieldKey, person[fieldKey] === 1 ? null : 1); }}
        style={{ width: 16, height: 16, accentColor: "#6D2323" }}
      />
      <span style={{ fontSize: 13, color: disabled ? "#999" : "#333" }}>Yes</span>
    </div>
    <div style={S.yesNoItem}>
      <input
        type="checkbox"
        disabled={disabled}
        checked={person[fieldKey] === 0}
        onChange={() => { if (!disabled) onChange(fieldKey, person[fieldKey] === 0 ? null : 0); }}
        style={{ width: 16, height: 16, accentColor: "#6D2323" }}
      />
      <span style={{ fontSize: 13, color: disabled ? "#999" : "#333" }}>No</span>
    </div>
  </div>
);

// ─── Condition row ────────────────────────────────────────────────────────────
// ✅ UPDATED: passes locked state through to YesNo + shows lock icon on label
const ConditionRow = ({ label, fieldKey, person, onChange, locked }) => (
  <div style={S.conditionRow}>
    <span style={{ ...S.conditionLabel, color: locked ? "#999" : "#333", display: "flex", alignItems: "center", gap: 4 }}>
      {label}
      {locked && <LockIcon style={{ fontSize: 12, color: "#c62828" }} />}
    </span>
    <YesNo fieldKey={fieldKey} person={person} onChange={onChange} disabled={locked} />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentDashboard4Mobile = () => {
  const settings = useContext(SettingsContext);

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [branches, setBranches] = useState([]);

  // ✅ ADDED: field-level permissions fetched from the shared store
  const [fieldPermissions, setFieldPermissions] = useState(null);
  // ✅ ADDED: userRole — needed by canStudentEdit
  const [userRole, setUserRole] = useState("");

  // ✅ ADDED: convenience wrapper — same pattern as desktop StudentDashboard4
  const isFieldEditable = (fieldId) => canStudentEdit(fieldPermissions, fieldId, userRole);

  useEffect(() => {
    if (!settings) return;
    if (settings.title_color) setTitleColor(settings.title_color);
    if (settings.subtitle_color) setSubtitleColor(settings.subtitle_color);
    if (settings.border_color) setBorderColor(settings.border_color);
    if (settings.main_button_color) setMainButtonColor(settings.main_button_color);
    if (settings.sub_button_color) setSubButtonColor(settings.sub_button_color);
    if (settings.stepper_color) setStepperColor(settings.stepper_color);
    if (settings.logo_url) setFetchedLogo(`${API_BASE_URL}${settings.logo_url}`);
    if (settings.company_name) setCompanyName(settings.company_name);
    if (settings.short_term) setShortTerm(settings.short_term);
    if (settings.campus_address) setCampusAddress(settings.campus_address);
    if (settings.branches) {
      setBranches(
        typeof settings.branches === "string"
          ? JSON.parse(settings.branches)
          : settings.branches
      );
    }
  }, [settings]);

  // ✅ ADDED: fetch field permissions from the shared store
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/student_edit_permissions`);
        setFieldPermissions(res.data && typeof res.data === "object" ? res.data : {});
      } catch (err) {
        console.warn("Could not load field permissions, defaulting to all editable:", err.message);
        setFieldPermissions({});
      }
    };
    loadPermissions();
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  const [userID, setUserID] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });
  const [errors, setErrors] = useState({});

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((p) => ({ ...p, open: false }));
  };

  const [person, setPerson] = useState({
    cough: "", colds: "", fever: "",
    asthma: "", faintingSpells: "", heartDisease: "", tuberculosis: "",
    frequentHeadaches: "", hernia: "", chronicCough: "", headNeckInjury: "",
    hiv: "", highBloodPressure: "", diabetesMellitus: "", allergies: "",
    cancer: "", smokingCigarette: "", alcoholDrinking: "",
    hospitalized: "", hospitalizationDetails: "",
    medications: "",
    hadCovid: "", covidDate: "",
    vaccine1Brand: "", vaccine1Date: "",
    vaccine2Brand: "", vaccine2Date: "",
    booster1Brand: "", booster1Date: "",
    booster2Brand: "", booster2Date: "",
    chestXray: "", cbc: "", urinalysis: "", otherworkups: "",
    symptomsToday: "",
    remarks: "",
  });

  const docLinks = [
    { label: "ECAT Application Form", to: "/student_ecat_application_form" },
    { label: "Admission Form Process", to: "/student_form_process" },
    { label: "Personal Data Form", to: "/student_personal_data_form" },
    { label: `Application For ${shortTerm?.toUpperCase() || ""} Admission`, to: "/student_office_of_the_registrar" },
    { label: "Admission Services", to: "/student_admission_services" },
  ];

  const [activeStep, setActiveStep] = useState(3);

  const showSnackbar = (message, severity = "warning") => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => setSnackbar((p) => ({ ...p, open: false })), 3000);
  };

  useEffect(() => {
    if (!settings) return;
    if (settings.short_term) setShortTerm(settings.short_term);
    if (settings.company_name) setCompanyName(settings.company_name);
  }, [settings]);

  // ✅ UPDATED: also reads and sets userRole
  useEffect(() => {
    const loggedInPersonId = localStorage.getItem("person_id");
    const storedRole = localStorage.getItem("role");
    if (!loggedInPersonId) { window.location.href = "/login"; return; }
    if (storedRole) setUserRole(storedRole);   // ✅ ADDED
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

  const handleUpdate = async (updated) => {
    try {
      const { person_id, created_at, current_step, ...clean } = updated;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, clean);
    } catch (err) { console.error("Auto-save failed:", err); }
  };

  // ✅ UPDATED: guard locked fields
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    if (!isFieldEditable(name)) return;   // ✅ ADDED
    const updated = { ...person, [name]: type === "checkbox" ? (checked ? 1 : 0) : value };
    setPerson(updated);
    handleUpdate(updated);
  };

  const handleStepClick = (index) => {
    showSnackbar("Your record has been saved successfully!", "success");
    setTimeout(() => { setActiveStep(index); navigate(STEP_PATHS[index]); }, 1000);
  };

  // ✅ UPDATED: guard locked fields
  const handleToggle = (fieldKey, newValue) => {
    if (!isFieldEditable(fieldKey)) return;   // ✅ ADDED
    const updated = { ...person, [fieldKey]: newValue };
    setPerson(updated);
    handleUpdate(updated);
  };

  // ✅ UPDATED: guard locked fields
  const handleTextChange = (name, value) => {
    if (!isFieldEditable(name)) return;   // ✅ ADDED
    const updated = { ...person, [name]: value };
    setPerson(updated);
    handleUpdate(updated);
  };

  const medicalConditions = [
    { label: "Asthma", key: "asthma" },
    { label: "Fainting Spells and Seizures", key: "faintingSpells" },
    { label: "Heart Disease", key: "heartDisease" },
    { label: "Tuberculosis", key: "tuberculosis" },
    { label: "Frequent Headaches", key: "frequentHeadaches" },
    { label: "Hernia", key: "hernia" },
    { label: "Chronic Cough", key: "chronicCough" },
    { label: "Head or Neck Injury", key: "headNeckInjury" },
    { label: "H.I.V", key: "hiv" },
    { label: "High Blood Pressure", key: "highBloodPressure" },
    { label: "Diabetes Mellitus", key: "diabetesMellitus" },
    { label: "Allergies", key: "allergies" },
    { label: "Cancer", key: "cancer" },
    { label: "Smoking of Cigarette/Day", key: "smokingCigarette" },
    { label: "Alcohol Drinking", key: "alcoholDrinking" },
  ];

  const vaccineColumns = [
    { label: "1st Dose", brandKey: "vaccine1Brand", dateKey: "vaccine1Date" },
    { label: "2nd Dose", brandKey: "vaccine2Brand", dateKey: "vaccine2Date" },
    { label: "Booster 1", brandKey: "booster1Brand", dateKey: "booster1Date" },
    { label: "Booster 2", brandKey: "booster2Brand", dateKey: "booster2Date" },
  ];

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
      <Snackbar
        open={snackbar.open}
        autoHideDuration={1000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 1, padding: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: { xs: "22px", sm: "28px", md: "36px" } }}>
          HEALTH MEDICAL RECORDS
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

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

      {/* Form Intro */}
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

      {/* ── I. Symptoms Today ─────────────────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>
          I. Symptoms Today
        </div>
        <div style={S.cardBody}>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
            Do you have any of the following symptoms today?
            {/* ✅ Show badge if all three symptom fields are locked */}
            {!isFieldEditable("cough") && !isFieldEditable("colds") && !isFieldEditable("fever") && <LockedBadge />}
          </div>
          {["cough", "colds", "fever"].map((symptom) => {
            const locked = !isFieldEditable(symptom);
            return (
              <div key={symptom} style={S.checkRow}>
                {/* ✅ UPDATED: disabled and onChange wired to permissions */}
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={person[symptom] === 1}
                  onChange={() => {
                    if (locked) return;
                    const updated = { ...person, [symptom]: person[symptom] === 1 ? 0 : 1 };
                    setPerson(updated);
                    handleUpdate(updated);
                  }}
                  style={{ width: 18, height: 18, accentColor: "#6D2323" }}
                />
                <span style={{ ...S.checkLabel, color: locked ? "#999" : "#333", display: "flex", alignItems: "center", gap: 4 }}>
                  {symptom.charAt(0).toUpperCase() + symptom.slice(1)}
                  {locked && <LockIcon style={{ fontSize: 12, color: "#c62828" }} />}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── II. Medical History ───────────────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>
          II. Medical History
        </div>
        <div style={S.cardBody}>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
            Have you suffered from, or been told you had, any of the following conditions?
          </div>
          {/* ✅ UPDATED: passes locked prop to ConditionRow */}
          {medicalConditions.map(({ label, key }) => (
            <ConditionRow
              key={key}
              label={label}
              fieldKey={key}
              person={person}
              onChange={handleToggle}
              locked={!isFieldEditable(key)}
            />
          ))}

          <hr style={S.divider} />

          {/* Hospitalization */}
          <div style={S.sectionLabel}>
            Hospitalization History
            {!isFieldEditable("hospitalized") && <LockedBadge />}
          </div>
          <div style={{ ...S.conditionRow, flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 13, color: !isFieldEditable("hospitalized") ? "#999" : "#333" }}>
              Do you have any previous history of hospitalization or operation?
            </span>
            {/* ✅ UPDATED: disabled wired to permission */}
            <YesNo fieldKey="hospitalized" person={person} onChange={handleToggle} disabled={!isFieldEditable("hospitalized")} />
          </div>

          {/* ✅ UPDATED: locked prop wired to permission */}
          <Field label="If Yes, Please Specify:" locked={!isFieldEditable("hospitalizationDetails")}>
            <input
              type="text"
              name="hospitalizationDetails"
              readOnly={!isFieldEditable("hospitalizationDetails")}
              value={person.hospitalizationDetails || ""}
              onChange={(e) => handleTextChange("hospitalizationDetails", e.target.value)}
              style={S.input(false, !isFieldEditable("hospitalizationDetails"))}
              placeholder="Enter details..."
            />
          </Field>
        </div>
      </div>

      {/* ── III. Medication ───────────────────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>
          III. Medication
        </div>
        <div style={S.cardBody}>
          {/* ✅ UPDATED: locked prop wired to permission */}
          <Field label="List all current medications:" locked={!isFieldEditable("medications")}>
            <textarea
              name="medications"
              readOnly={!isFieldEditable("medications")}
              value={person.medications || ""}
              onChange={(e) => handleTextChange("medications", e.target.value)}
              style={S.textarea(!isFieldEditable("medications"))}
              placeholder="Enter medications or type NA"
            />
          </Field>
        </div>
      </div>

      {/* ── IV. COVID Profile ─────────────────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>
          IV. COVID Profile
        </div>
        <div style={S.cardBody}>

          {/* A. COVID History */}
          <div style={S.sectionLabel}>
            A. COVID-19 History
            {!isFieldEditable("hadCovid") && <LockedBadge />}
          </div>
          <div style={{ ...S.conditionRow, flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 13, color: !isFieldEditable("hadCovid") ? "#999" : "#333" }}>
              Do you have history of COVID-19?
            </span>
            {/* ✅ UPDATED: disabled wired to permission */}
            <YesNo fieldKey="hadCovid" person={person} onChange={handleToggle} disabled={!isFieldEditable("hadCovid")} />
          </div>

          {/* ✅ UPDATED: locked prop wired to permission */}
          <Field label="If Yes, When:" locked={!isFieldEditable("covidDate")}>
            <DateField
              size="small"
              name="covidDate"
              readOnly={!isFieldEditable("covidDate")}
              value={person.covidDate || ""}
              onChange={(e) => handleTextChange("covidDate", e.target.value)}
              style={S.input(false, !isFieldEditable("covidDate"))}
            />
          </Field>

          <hr style={S.divider} />

          {/* B. Vaccinations */}
          <div style={S.sectionLabel}>B. COVID Vaccinations</div>
          {vaccineColumns.map(({ label, brandKey, dateKey }) => {
            const brandLocked = !isFieldEditable(brandKey);
            const dateLocked = !isFieldEditable(dateKey);
            return (
              <div key={brandKey} style={{ backgroundColor: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6D2323", marginBottom: 8 }}>{label}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    {/* ✅ UPDATED: locked prop and readOnly wired to permission */}
                    <Field label="Brand" locked={brandLocked}>
                      <input
                        type="text"
                        name={brandKey}
                        readOnly={brandLocked}
                        value={person[brandKey] || ""}
                        onChange={(e) => handleTextChange(brandKey, e.target.value)}
                        style={{ ...S.input(false, brandLocked), height: 38 }}
                        placeholder="Brand name"
                      />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    {/* ✅ UPDATED: locked prop and readOnly wired to permission */}
                    <Field label="Date" locked={dateLocked}>
                      <DateField
                        size="small"
                        name={dateKey}
                        readOnly={dateLocked}
                        value={person[dateKey] || ""}
                        onChange={(e) => handleTextChange(dateKey, e.target.value)}
                        style={{ ...S.input(false, dateLocked), height: 38 }}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── V. Lab Results ────────────────────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>
          V. Laboratory Results
        </div>
        <div style={S.cardBody}>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
            Please indicate the result of the following:
          </div>
          {[
            { label: "Chest X-ray", key: "chestXray" },
            { label: "CBC", key: "cbc" },
            { label: "Urinalysis", key: "urinalysis" },
            { label: "Other Workups", key: "otherworkups" },
          ].map(({ label, key }) => {
            const locked = !isFieldEditable(key);
            return (
              // ✅ UPDATED: locked prop wired to permission
              <Field key={key} label={label} locked={locked}>
                <input
                  type="text"
                  name={key}
                  readOnly={locked}
                  value={person[key] || ""}
                  onChange={(e) => handleTextChange(key, e.target.value)}
                  style={S.input(false, locked)}
                  placeholder="Enter result or NA"
                />
              </Field>
            );
          })}
        </div>
      </div>

      {/* ── VI. Diagnosis — system-locked for students (matches desktop) ── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>
          VI. Diagnosis
        </div>
        <div style={{ ...S.cardBody, backgroundColor: userRole === "student" ? "#fafafa" : undefined }}>
          <div style={{ fontSize: 13, color: userRole === "student" ? "#999" : "#333", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            Diagnosis Result:
            {/* ✅ System-locked for students — same rule as desktop */}
            {userRole === "student" && <LockedBadge />}
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={S.yesNoItem}>
              <input
                type="checkbox"
                disabled={userRole === "student"}
                checked={person.symptomsToday === 0}
                onChange={() => {
                  if (userRole === "student") return;
                  const updated = { ...person, symptomsToday: person.symptomsToday === 0 ? null : 0 };
                  setPerson(updated);
                  handleUpdate(updated);
                }}
                style={{ width: 16, height: 16, accentColor: "#6D2323" }}
              />
              <span style={{ fontSize: 13, marginLeft: 4, color: userRole === "student" ? "#999" : "#333" }}>Physically Fit</span>
            </div>
            <div style={S.yesNoItem}>
              <input
                type="checkbox"
                disabled={userRole === "student"}
                checked={person.symptomsToday === 1}
                onChange={() => {
                  if (userRole === "student") return;
                  const updated = { ...person, symptomsToday: person.symptomsToday === 1 ? null : 1 };
                  setPerson(updated);
                  handleUpdate(updated);
                }}
                style={{ width: 16, height: 16, accentColor: "#6D2323" }}
              />
              <span style={{ fontSize: 13, marginLeft: 4, color: userRole === "student" ? "#999" : "#333" }}>For Compliance</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── VII. Remarks — system-locked for students (matches desktop) ── */}
      <div style={{ ...S.card, marginBottom: 16, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>
          VII. Remarks
        </div>
        <div style={{ ...S.cardBody, backgroundColor: userRole === "student" ? "#fafafa" : undefined }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
            Remarks:
            {/* ✅ System-locked for students — matches desktop */}
            {userRole === "student" && <LockedBadge />}
          </div>
          <textarea
            name="remarks"
            disabled={userRole === "student"}
            value={person.remarks || ""}
            onChange={(e) => {
              if (userRole === "student") return;
              handleTextChange("remarks", e.target.value);
            }}
            style={S.textarea(userRole === "student")}
            placeholder="Remarks from physician..."
          />
        </div>

        {/* Navigation Buttons */}
        <Box display="flex" justifyContent="space-between" mt={1} mx="12px" mb={3}>
          <Button
            variant="contained"
            onClick={() => {
              handleUpdate(person);
              showSnackbar("Your record has been saved successfully!", "success");
              setTimeout(() => navigate("/student_educational_attainment"), 1000);
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
              showSnackbar("Your record has been saved successfully!", "success");
              setTimeout(() => navigate("/student_other_information"), 1000);
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

export default StudentDashboard4Mobile;
