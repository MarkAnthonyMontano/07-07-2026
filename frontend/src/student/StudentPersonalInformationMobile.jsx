import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import DateField from "../components/DateField";
import regions from "../data/region.json";
import provinces from "../data/province.json";
import cities from "../data/city.json";
import barangays from "../data/barangay.json";
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
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import LockIcon from "@mui/icons-material/Lock";           // ← NEW
import { motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Snackbar, Alert } from "@mui/material";
import useStudentEditPermissions from "../account_management/useStudentEditPermissions"; // ← NEW

// ─── Inline mobile-only styles ──────────────────────────────────────────────
const S = {
  screen: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    fontFamily: "'Segoe UI', sans-serif",
    paddingBottom: 80,
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    backgroundColor: "#6D2323",
    color: "#fff",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
  },
  headerTitle: { fontSize: 16, fontWeight: 700, flex: 1, letterSpacing: 0.5 },
  headerSub: { fontSize: 11, opacity: 0.8 },
  stepperWrap: {
    backgroundColor: "#fff",
    padding: "12px 8px",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    alignItems: "center",
    overflowX: "auto",
    gap: 0,
  },
  stepItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 56,
    cursor: "pointer",
  },
  stepCircle: (active) => ({
    width: 34,
    height: 34,
    borderRadius: "50%",
    backgroundColor: active ? "#6D2323" : "#E8C999",
    color: active ? "#fff" : "#333",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    border: active ? "2px solid #6D2323" : "2px solid #ccc",
    transition: "all 0.2s",
  }),
  stepLabel: (active) => ({
    fontSize: 9,
    marginTop: 4,
    textAlign: "center",
    color: active ? "#6D2323" : "#666",
    fontWeight: active ? 700 : 400,
    lineHeight: 1.2,
    maxWidth: 52,
  }),
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#6D2323",
    alignSelf: "center",
    minWidth: 8,
    marginBottom: 18,
  },
  notice: {
    backgroundColor: "#fffaf5",
    border: "1px solid #6D2323",
    borderRadius: 8,
    margin: "12px 12px 0",
    padding: "10px 12px",
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  noticeIcon: {
    backgroundColor: "#800000",
    borderRadius: 6,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "#fff",
    fontSize: 18,
  },
  noticeText: { fontSize: 12, color: "#3e3e3e", lineHeight: 1.5 },
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
  docChipsWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "12px 12px 0",
  },
  docChip: (color) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    border: `1px solid ${color || "#6D2323"}`,
    borderRadius: 20,
    padding: "6px 12px",
    fontSize: 12,
    color: color || "#6D2323",
    fontWeight: 600,
    cursor: "pointer",
  }),
  profileBox: (hasError) => ({
    width: "100%",
    aspectRatio: "1",
    maxWidth: 140,
    border: `2px dashed ${hasError ? "#d32f2f" : "#6D2323"}`,
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#fafafa",
    cursor: "pointer",
    alignSelf: "center",
    margin: "0 auto 12px",
  }),
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
    appearance: "none",
    WebkitAppearance: "none",
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
  textarea: (hasError) => ({
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${hasError ? "#d32f2f" : "#ccc"}`,
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: "#fff",
    boxSizing: "border-box",
    outline: "none",
    color: "#222",
    resize: "vertical",
    minHeight: 80,
  }),
  helperError: { color: "#d32f2f", fontSize: 11, marginTop: 3 },
  row: { display: "flex", gap: 10 },
  flex1: { flex: 1 },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    fontSize: 13,
    color: "#333",
    cursor: "pointer",
  },
  checkbox: { width: 18, height: 18, accentColor: "#6D2323", cursor: "pointer" },
  warningBox: {
    backgroundColor: "#FFF4E5",
    border: "1px solid #FFA726",
    borderRadius: 8,
    padding: "10px 12px",
    marginBottom: 12,
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
  },
  warningText: { fontSize: 12, color: "#BF360C", lineHeight: 1.5 },
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
  btnPrimary: {
    flex: 1,
    height: 46,
    backgroundColor: "#6D2323",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnSecondary: {
    flex: 1,
    height: 46,
    backgroundColor: "#fff",
    color: "#6D2323",
    border: "2px solid #6D2323",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  toast: (severity) => ({
    position: "fixed",
    top: 16,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9999,
    backgroundColor:
      severity === "success"
        ? "#2e7d32"
        : severity === "error"
          ? "#c62828"
          : severity === "info"
            ? "#0277bd"
            : "#e65100",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: 24,
    fontSize: 13,
    boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
    maxWidth: "90vw",
    textAlign: "center",
  }),
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 500,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: "18px 18px 0 0",
    width: "100%",
    maxWidth: 480,
    padding: "20px 16px 32px",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    margin: "0 auto 16px",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#6D2323",
    textAlign: "center",
    marginBottom: 16,
  },
  // ── NEW: locked field background ──────────────────────────────────────────
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
    appearance: "none",
    WebkitAppearance: "none",
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
        {lockedBadge && (
          // ── NEW: inline locked badge matching desktop ─────────────────────
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
              fontWeight: 700,
              verticalAlign: "middle",
            }}
          >
            🔒 Locked by Admin
          </span>
        )}
      </label>
    )}
    {children}
    {error && helperText && <div style={S.helperError}>{helperText}</div>}
  </div>
);

const MInput = ({ error, locked, style, ...props }) => (
  <input
    style={{ ...(locked ? S.lockedInput(error) : S.input(error)), ...style }}
    {...props}
  />
);

const MSelect = ({ error, locked, style, children, ...props }) => (
  <select
    style={{ ...(locked ? S.lockedSelect(error) : S.select(error)), ...style }}
    {...props}
  >
    {children}
  </select>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const ApplicantDashboard1Mobile = () => {
  const settings = useContext(SettingsContext);

  // ── Permissions hook — must be at the very top ────────────────────────────
  const { canEdit: canEditField, permissionsLoaded } = useStudentEditPermissions(); // ← NEW

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

  const [userID, setUserID] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [userRole, setUserRole] = useState("");  // ← needed for canEdit wrapper

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLrnNA, setIsLrnNA] = useState(false);
  const [errors, setErrors] = useState({});
  const [yearLevelOptions, setYearLevelOptions] = useState([]);
  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [programAvailability, setProgramAvailability] = useState([]);

  const [regionList, setRegionList] = useState([]);
  const [provinceList, setProvinceList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [barangayList, setBarangayList] = useState([]);
  const [permanentRegionList, setPermanentRegionList] = useState([]);
  const [permanentProvinceList, setPermanentProvinceList] = useState([]);
  const [permanentCityList, setPermanentCityList] = useState([]);
  const [permanentBarangayList, setPermanentBarangayList] = useState([]);
  const [permanentRegion, setPermanentRegion] = useState("");
  const [permanentProvince, setPermanentProvince] = useState("");
  const [permanentCity, setPermanentCity] = useState("");
  const [permanentBarangay, setPermanentBarangay] = useState("");

  const [activeStep, setActiveStep] = useState(0);

  const [person, setPerson] = useState({
    profile_img: "", campus: "", academicProgram: "", classifiedAs: "",
    applyingAs: "", program: "", yearLevel: "", last_name: "", first_name: "",
    middle_name: "", extension: "", nickname: "", height: "", weight: "",
    lrnNumber: "", gender: "", pwdMember: 0, pwdType: "", pwdId: "",
    birthOfDate: "", age: "", birthPlace: "", languageDialectSpoken: "",
    citizenship: "", religion: "", civilStatus: "", tribeEthnicGroup: "",
    cellphoneNumber: "", emailAddress: "", presentStreet: "", presentBarangay: "",
    presentZipCode: "", presentRegion: "", presentProvince: "", presentMunicipality: "",
    presentDswdChecked: 0, presentDswdHouseholdNumber: "", sameAsPresentAddress: 0,
    permanentStreet: "", permanentBarangay: "", permanentZipCode: "",
    permanentRegion: "", permanentProvince: "", permanentMunicipality: "",
    permanentDswdChecked: 0, permanentDswdHouseholdNumber: "",
  });

  const navigate = useNavigate();
  const location = useLocation();

  // ── canEdit wrapper — mirrors StudentDashboard1 exactly ──────────────────
  const canEdit = (fieldId) => canEditField(fieldId, userRole); // ← NEW

  const showSnackbar = (message, severity = "warning") => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => setSnackbar((p) => ({ ...p, open: false })), 3000);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((p) => ({ ...p, open: false }));
  };

  // ── Settings ──────────────────────────────────────────────────────────────
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

  // ── Auth + Person load ────────────────────────────────────────────────────
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const loggedInPersonId = localStorage.getItem("person_id");
    if (!loggedInPersonId) { window.location.href = "/login"; return; }
    setUserRole(storedRole);     // ← store role so canEdit() works
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

  // ── Reference data ────────────────────────────────────────────────────────
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/year-levels`).then((r) => setYearLevelOptions(r.data)).catch(console.error);
    axios.get(`${API_BASE_URL}/api/applied_program`).then((r) => setCurriculumOptions(r.data)).catch(console.error);
    setRegionList(regions);
    setPermanentRegionList(regions);
  }, []);

  // ── Present address cascades ──────────────────────────────────────────────
  useEffect(() => {
    const region = regions.find((r) => r.region_name === person.presentRegion);
    setProvinceList(region ? provinces.filter((p) => p.region_code === region.region_code) : []);
  }, [person.presentRegion]);
  useEffect(() => {
    const prov = provinces.find((p) => p.province_name === person.presentProvince);
    setCityList(prov ? cities.filter((c) => c.province_code === prov.province_code) : []);
  }, [person.presentProvince]);
  useEffect(() => {
    const city = cities.find((c) => c.city_name === person.presentMunicipality);
    setBarangayList(city ? barangays.filter((b) => b.city_code === city.city_code) : []);
  }, [person.presentMunicipality]);

  // ── Permanent address cascades ────────────────────────────────────────────
  useEffect(() => {
    const region = regions.find((r) => r.region_name === person.permanentRegion);
    setPermanentProvinceList(region ? provinces.filter((p) => p.region_code === region.region_code) : []);
  }, [person.permanentRegion]);
  useEffect(() => {
    const prov = provinces.find((p) => p.province_name === person.permanentProvince);
    setPermanentCityList(prov ? cities.filter((c) => c.province_code === prov.province_code) : []);
  }, [person.permanentProvince]);
  useEffect(() => {
    const city = cities.find((c) => c.city_name === person.permanentMunicipality);
    setPermanentBarangayList(city ? barangays.filter((b) => b.city_code === city.city_code) : []);
  }, [person.permanentMunicipality]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const parseISODate = (s) => {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const calculateAge = (birthDateString) => {
    const bd = parseISODate(birthDateString);
    if (!bd) return "";
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--;
    return age < 0 ? "" : age;
  };
  const getBranchLabel = (branchId) => {
    const branch = branches.find((item) => String(item.id) === String(branchId));
    return branch?.branch || "—";
  };
  const autoSave = async () => {
    try { await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, person); }
    catch (err) { console.error("Auto-save failed:", err); }
  };

  const handleUpdate = async (updatedPerson) => {
    try {
      const { presentDswdChecked, permanentDswdChecked, ...toSave } = updatedPerson;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, toSave);
    } catch (err) { console.error("Auto-save failed:", err); }
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    const updatedValue = type === "checkbox" ? (checked ? 1 : 0) : value;
    const updatedPerson = { ...person, [name]: updatedValue };
    if (name === "academicProgram") updatedPerson.yearLevel = Number(value) === 1 ? "Master" : "";
    if (name === "birthOfDate") updatedPerson.age = calculateAge(value);
    if (name === "classifiedAs" && value === "Freshman (First Year)") updatedPerson.yearLevel = "First Year";
    if (name === "campus" || name === "academicProgram") updatedPerson.program = "";
    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  const filteredCurriculum = curriculumOptions.filter((item) => {
    if (person.academicProgram !== "" && person.academicProgram !== null) {
      if (Number(item.academic_program) !== Number(person.academicProgram)) return false;
    }
    return true;
  });

  const filteredYearLevels = yearLevelOptions.filter((yl) =>
    Number(person.academicProgram) === 1 ? yl.level_type === "graduate" : yl.level_type === "year"
  );

  const isFormValid = () => {
    const required = [
      "campus", "academicProgram", "classifiedAs", "applyingAs", "program", "yearLevel",
      "profile_img", "last_name", "first_name", "height", "weight", "gender", "birthOfDate",
      "age", "birthPlace", "languageDialectSpoken", "citizenship", "religion", "civilStatus",
      "tribeEthnicGroup", "cellphoneNumber", "emailAddress", "presentStreet", "presentZipCode",
      "presentRegion", "presentProvince", "presentMunicipality", "presentBarangay",
      "permanentStreet", "permanentZipCode", "permanentRegion", "permanentProvince",
      "permanentMunicipality", "permanentBarangay",
    ];
    const newErrors = {};
    required.forEach((f) => {
      const v = person[f];
      if (!v && v !== 0) newErrors[f] = true;
    });
    const emailPattern = /^[^@]+@[^@]+\.[^@]+$/;
    if (!person.emailAddress?.trim() || !emailPattern.test(person.emailAddress.trim())) newErrors.emailAddress = true;
    if (!isLrnNA && !person.lrnNumber?.toString().trim()) newErrors.lrnNumber = true;
    if (person.presentDswdChecked === 1 && !person.presentDswdHouseholdNumber?.trim()) newErrors.presentDswdHouseholdNumber = true;
    if (person.permanentDswdChecked === 1 && !person.permanentDswdHouseholdNumber?.trim()) newErrors.permanentDswdHouseholdNumber = true;
    if (person.pwdMember === 1) {
      if (!person.pwdType?.toString().trim()) newErrors.pwdType = true;
      if (!person.pwdId?.toString().trim()) newErrors.pwdId = true;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      showSnackbar("Invalid file type. Please select JPEG or PNG.", "error"); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showSnackbar("File too large. Max 2MB.", "error"); return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) { showSnackbar("Please select a file first.", "warning"); return; }
    const formData = new FormData();
    formData.append("profile_picture", selectedFile);
    formData.append("person_id", userID);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/upload-profile-picture`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fileName = response.data.filename || response.data.profile_img;
      const updatedPerson = { ...person, profile_img: fileName };
      setPerson(updatedPerson);
      await handleUpdate(updatedPerson);
      showSnackbar("Photo uploaded successfully!", "success");
      setUploadModalOpen(false);
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      showSnackbar(err.response?.data?.error || "Upload failed.", "error");
    }
  };

  const handleNext = () => {
    handleUpdate(person);
    if (isFormValid()) {
      showSnackbar("Your record has been saved successfully!", "success");
      setTimeout(() => navigate("/student_family_background"), 1000);
    } else {
      showSnackbar("Please fill all required fields before proceeding.", "error");
    }
  };

  const handleStepClick = (index) => {
    if (isFormValid()) {
      showSnackbar("Your record has been saved successfully!", "success");
      setTimeout(() => { setActiveStep(index); navigate(STEP_PATHS[index]); }, 1000);
    } else {
      showSnackbar("Please fill all required fields before proceeding.", "error");
    }
  };

  const docLinks = [
    { label: "ECAT Application Form", to: "/student_ecat_application_form" },
    { label: "Admission Form Process", to: "/student_form_process" },
    { label: "Personal Data Form", to: "/student_personal_data_form" },
    { label: `Application For ${shortTerm?.toUpperCase() || ""} Admission`, to: "/student_office_of_the_registrar" },
    { label: "Admission Services", to: "/student_admission_services" },
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={S.screen}>
      {/* Toast */}
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
          PERSONAL INFORMATION
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      {/* Notice */}
      <Box
        sx={{
          display: "flex", alignItems: "flex-start", gap: 1.5, mx: "12px", mt: "12px",
          p: "10px 12px", borderRadius: "8px", backgroundColor: "#fffaf5",
          border: "1px solid #6D2323", boxShadow: "0px 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#800000", borderRadius: "6px", width: 36, height: 36, flexShrink: 0 }}>
          <ErrorIcon sx={{ color: "white", fontSize: 22 }} />
        </Box>
        <Typography
          sx={{
            fontSize: "20px",
            fontFamily: "Poppins, sans-serif",
            color: "#3e3e3e",
            lineHeight: 1.3,
            whiteSpace: "normal",
            overflow: "hidden",
          }}
        >
          <strong style={{ color: "maroon" }}>Important Notice:</strong>
          <br />



          <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>
          Please indicate <strong>“NA”</strong> or <strong>“N/A”</strong> in fields where the
          requested information is not applicable or no response can be provided.
          <br />

          <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>
          To enter the letter <strong>“Ñ”</strong>, press and hold the ALT key while typing
          <strong> 165</strong>. For <strong>“ñ”</strong>, press and hold the ALT key while
          typing <strong> 164</strong>.
          <br />

          <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>
          Please complete all information from <strong>Personal Information</strong> up to
          <strong> Other Information</strong> before printing your documents.
          <br />
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
                sx={{
                  display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center",
                  gap: 0.75, px: 1.5, py: 1.25, height: 52, width: "100%", borderRadius: "12px",
                  border: `1px solid ${borderColor || "#6D2323"}`, backgroundColor: "#fff", cursor: "pointer",
                  transition: "all 0.25s ease-in-out",
                  "&:hover": { backgroundColor: settings?.header_color || "#6D2323", "& .chip-icon": { color: "#fff" }, "& .chip-text": { color: "#fff" } },
                }}
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
              <Box
                sx={{
                  width: 46, height: 46, borderRadius: "50%", border: `2px solid ${borderColor}`,
                  backgroundColor: activeStep === index ? (settings?.header_color || "#6D2323") : "#E8C999",
                  color: activeStep === index ? "#fff" : "#333", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 20, transition: "all 0.2s",
                }}
              >
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

      {/* ── SECTION: Personal Information ─────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>Personal Information</div>
        <div style={S.cardBody}>

          {/* Campus — system-locked */}
          <Field label="Campus" required error={errors.campus} helperText="This field is required.">
            <MSelect name="campus" value={person.campus || ""} onChange={handleChange} error={errors.campus} disabled>
              <option value="">Select Campus</option>
              {branches.map((b) => <option key={b.id} value={String(b.id)}>{b.branch.toUpperCase()}</option>)}
            </MSelect>
          </Field>

          {/* Academic Program — system-locked */}
          <Field label="Academic Program" required error={errors.academicProgram} helperText="This field is required.">
            <MSelect name="academicProgram" value={person.academicProgram || ""} onChange={handleChange} error={errors.academicProgram} disabled>
              <option value="">Select Program</option>
              <option value="0">Undergraduate</option>
              <option value="1">Graduate</option>
              <option value="2">Techvoc</option>
            </MSelect>
          </Field>

          {/* Classified As — admin-controlled */}
          <Field label="Classified As" required error={errors.classifiedAs} helperText="This field is required." lockedBadge={!canEdit("classifiedAs")}>
            <MSelect
              name="classifiedAs"
              value={person.classifiedAs || ""}
              onChange={canEdit("classifiedAs") ? handleChange : undefined}
              disabled={!canEdit("classifiedAs")}
              locked={!canEdit("classifiedAs")}
              error={errors.classifiedAs}
            >
              <option value="">Select Classification</option>
              <option value="Freshman (First Year)">Freshman (First Year)</option>
              <option value="Transferee">Transferee</option>
              <option value="Returnee">Returnee</option>
              <option value="Shiftee">Shiftee</option>
              <option value="Foreign Student">Foreign Student</option>
            </MSelect>
          </Field>

          {/* Applying As — admin-controlled */}
          <Field label="Applying As" required error={errors.applyingAs} helperText="This field is required." lockedBadge={!canEdit("applyingAs")}>
            <MSelect
              name="applyingAs"
              value={person.applyingAs || ""}
              onChange={canEdit("applyingAs") ? handleChange : undefined}
              disabled={!canEdit("applyingAs")}
              locked={!canEdit("applyingAs")}
              error={errors.applyingAs}
            >
              <option value="">Select Applying As</option>
              <option value="1">Senior High School Graduate</option>
              <option value="2">Senior High School Graduating Student</option>
              <option value="3">ALS (Alternative Learning System) Passer</option>
              <option value="4">Transferee from other University/College</option>
              <option value="5">Cross Enrolee Student</option>
              <option value="6">Foreign Applicant/Student</option>
              <option value="7">Baccalaureate Graduate</option>
              <option value="8">Master Degree Graduate</option>
            </MSelect>
          </Field>

        </div>
      </div>

      {/* ── SECTION: Course Program ───────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>Course Program</div>
        <div style={S.cardBody}>

          {/* Profile Photo — admin-controlled */}
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>
              Student Photo <span style={S.required}>*</span>
              {!canEdit("profile_img") && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 6, padding: "1px 6px", borderRadius: 4, backgroundColor: "#fce4ec", color: "#c62828", fontSize: 10, fontWeight: 700, verticalAlign: "middle" }}>
                  🔒 Locked by Admin
                </span>
              )}
            </label>
            <div
              style={S.profileBox(errors.profile_img)}
              onClick={() => canEdit("profile_img") && setUploadModalOpen(true)}
            >
              {person.profile_img ? (
                <img src={`${API_BASE_URL}/uploads/Student1by1/${person.profile_img}`} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <div style={{ fontSize: 32 }}>{canEdit("profile_img") ? "📷" : "🔒"}</div>
                  <div style={{ fontSize: 11, color: errors.profile_img ? "#d32f2f" : "#888", textAlign: "center", padding: "0 8px" }}>
                    {errors.profile_img ? "Photo required" : canEdit("profile_img") ? "Tap to upload photo" : "Photo locked by admin"}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Photo Upload Modal */}
          {uploadModalOpen && (
            <div
              style={S.overlay}
              onClick={(e) => { if (e.target === e.currentTarget) { setUploadModalOpen(false); setPreview(null); setSelectedFile(null); } }}
            >
              <div style={{ backgroundColor: "#fff", borderRadius: 12, width: "92%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", padding: 20, position: "relative", margin: "auto" }}>
                <IconButton size="small" onClick={() => { setUploadModalOpen(false); setPreview(null); setSelectedFile(null); }} sx={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, backgroundColor: "#000", color: "#fff", border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.25)", zIndex: 10 }}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <div style={{ backgroundColor: settings?.header_color || "#1976d2", color: "#fff", borderRadius: 8, padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                  Upload Your Photo
                </div>
                {(preview || person.profile_img) && (
                  <div style={{ position: "relative", width: 160, margin: "0 auto 16px" }}>
                    <img src={preview || `${API_BASE_URL}/uploads/Student1by1/${person.profile_img}`} alt="Preview" style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 8, border: "2px solid #6D2323", display: "block" }} />
                    <IconButton size="small" onClick={async () => { setSelectedFile(null); setPreview(null); const updated = { ...person, profile_img: "" }; setPerson(updated); await handleUpdate(updated); showSnackbar("Photo removed.", "info"); }} sx={{ position: "absolute", top: -10, right: -10, width: 28, height: 28, backgroundColor: "#000", color: "#fff", border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </div>
                )}
                <div style={{ border: "1px dashed #ccc", borderRadius: 8, padding: "12px 14px", marginBottom: 16, backgroundColor: "#f9f9f9", fontSize: 12, color: "#444", lineHeight: 1.8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Guidelines:</div>
                  {["Size: 2\" x 2\"", "Color: Your photo must be in colored.", "Background: White.", "Head size and position: Look directly into the camera at a straight angle, face centered.", "File types: JPEG, JPG, PNG", "Attire must be formal.", "Required File Size: 2MB"].map((g, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 2 }}><span style={{ color: "#6D2323", fontWeight: 700, flexShrink: 0 }}>•</span><span>{g}</span></div>
                  ))}
                  <div style={{ fontWeight: 700, fontSize: 13, margin: "10px 0 6px" }}>How to Change the Photo?</div>
                  {["Tap the × button to remove the current photo", "Choose a new file", "Tap the Upload button"].map((g, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 2 }}><span style={{ color: "#6D2323", fontWeight: 700, flexShrink: 0 }}>•</span><span>{g}</span></div>
                  ))}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#6D2323", marginBottom: 6 }}>Select Your Image:</div>
                <input type="file" accept=".jpg,.jpeg,.png" onChange={handleFileChange} onClick={(e) => (e.target.value = null)} style={{ display: "block", width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: 6, marginBottom: 14, fontSize: 13, boxSizing: "border-box" }} />
                <button style={{ ...S.btnPrimary, width: "100%", backgroundColor: mainButtonColor }} onClick={handleUpload}>Upload</button>
              </div>
            </div>
          )}

          {/* Course Applied — system-locked */}
          <Field label="Course Applied" required error={errors.program} helperText="This field is required.">
            <MSelect disabled name="program" value={person.program || ""} onChange={handleChange} error={errors.program}>
              <option value="">Select Program</option>
              {filteredCurriculum.map((item, i) => (
                <option key={i} value={item.curriculum_id}>
                  ({item.program_code}): {item.program_description}{item.major ? ` (${item.major})` : ""} ({item.current_year}-{item.next_year}) ({getBranchLabel(item.components)})
                </option>
              ))}
            </MSelect>
          </Field>

          {/* Year Level — system-locked */}
          <Field label="Year Level" required error={errors.yearLevel} helperText="This field is required.">
            <MSelect disabled name="yearLevel" value={person.yearLevel || ""} onChange={handleChange} error={errors.yearLevel}>
              <option value="">Select Year Level</option>
              {filteredYearLevels.map((yl) => <option key={yl.year_level_id} value={String(yl.year_level_id)}>{yl.year_level_description}</option>)}
            </MSelect>
          </Field>
        </div>
      </div>

      {/* ── SECTION: Person Details ───────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>Person Details</div>
        <div style={S.cardBody}>

          {/* Last Name — system-locked */}
          <Field label="Last Name" required error={errors.last_name} helperText="This field is required.">
            <MInput disabled name="last_name" value={(person.last_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "last_name", value: e.target.value.toUpperCase() } })} error={errors.last_name} placeholder="Enter your Last Name" />
          </Field>

          {/* First Name — system-locked */}
          <Field label="First Name" required error={errors.first_name} helperText="This field is required.">
            <MInput disabled name="first_name" value={(person.first_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "first_name", value: e.target.value.toUpperCase() } })} error={errors.first_name} placeholder="Enter your First Name" />
          </Field>

          <div style={S.row}>
            {/* Middle Name — system-locked */}
            <div style={S.flex1}>
              <Field label="Middle Name">
                <MInput disabled name="middle_name" value={(person.middle_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "middle_name", value: e.target.value.toUpperCase() } })} placeholder="Enter your Middle Name" />
              </Field>
            </div>
            {/* Extension — admin-controlled */}
            <div style={{ width: 120 }}>
              <Field label="Extension" lockedBadge={!canEdit("extension")}>
                <MSelect
                  name="extension"
                  value={person.extension || ""}
                  onChange={canEdit("extension") ? handleChange : undefined}
                  disabled={!canEdit("extension")}
                  locked={!canEdit("extension")}
                >
                  <option value="">None</option>
                  {["Jr.", "Sr.", "I", "II", "III", "IV", "V"].map((v) => <option key={v} value={v}>{v}</option>)}
                </MSelect>
              </Field>
            </div>
          </div>

          {/* Nickname — admin-controlled */}
          <Field label="Nickname" lockedBadge={!canEdit("nickname")}>
            <MInput
              name="nickname"
              value={person.nickname || ""}
              onChange={canEdit("nickname") ? handleChange : undefined}
              readOnly={!canEdit("nickname")}
              locked={!canEdit("nickname")}
              placeholder="Enter your Nickname"
            />
          </Field>

          <div style={S.row}>
            {/* Height — admin-controlled */}
            <div style={S.flex1}>
              <Field label="Height (cm)" required error={errors.height} helperText="Required" lockedBadge={!canEdit("height")}>
                <MInput
                  type="number" name="height" value={person.height || ""}
                  onChange={canEdit("height") ? handleChange : undefined}
                  readOnly={!canEdit("height")}
                  locked={!canEdit("height")}
                  error={errors.height} placeholder="cm"
                />
              </Field>
            </div>
            {/* Weight — admin-controlled */}
            <div style={S.flex1}>
              <Field label="Weight (kg)" required error={errors.weight} helperText="Required" lockedBadge={!canEdit("weight")}>
                <MInput
                  type="number" name="weight" value={person.weight || ""}
                  onChange={canEdit("weight") ? handleChange : undefined}
                  readOnly={!canEdit("weight")}
                  locked={!canEdit("weight")}
                  error={errors.weight} placeholder="kg"
                />
              </Field>
            </div>
          </div>

          {/* LRN — system-locked */}
          <Field label="Learning Reference Number (LRN)" required={!isLrnNA} error={errors.lrnNumber} helperText="This field is required.">
            <MInput
              name="lrnNumber"
              value={person.lrnNumber === "No LRN Number" ? "" : person.lrnNumber || ""}
              onChange={handleChange}
              disabled={person.lrnNumber === "No LRN Number"}
              error={errors.lrnNumber}
              placeholder="Enter LRN Number"
              style={{ opacity: person.lrnNumber === "No LRN Number" ? 0.5 : 1 }}
            />
            <label style={{ ...S.checkRow, marginTop: 6 }}>
              <input
                type="checkbox" style={S.checkbox} checked={person.lrnNumber === "No LRN Number"}
                onChange={(e) => { const checked = e.target.checked; const updated = { ...person, lrnNumber: checked ? "No LRN Number" : "" }; setPerson(updated); setIsLrnNA(checked); handleUpdate(updated); }}
              />
              N/A — No LRN Number
            </label>
          </Field>

          {/* Gender — system-locked */}
          <Field label="Sex / Gender" required error={errors.gender} helperText="This field is required.">
            <MSelect name="gender" value={person.gender == null ? "" : String(person.gender)} onChange={(e) => handleChange({ target: { name: "gender", value: e.target.value === "" ? null : parseInt(e.target.value, 10) } })} error={errors.gender}>
              <option value="">Select Gender</option>
              <option value="0">MALE</option>
              <option value="1">FEMALE</option>
            </MSelect>
          </Field>

          {/* PWD — admin-controlled */}
          <label style={S.checkRow}>
            <input
              type="checkbox" style={S.checkbox} checked={person.pwdMember === 1}
              onChange={canEdit("pwdMember") ? (e) => { const checked = e.target.checked; const updated = { ...person, pwdMember: checked ? 1 : 0, pwdType: checked ? person.pwdType || "" : "", pwdId: checked ? person.pwdId || "" : "" }; setPerson(updated); handleUpdate(updated); } : undefined}
              disabled={!canEdit("pwdMember")}
            />
            Person with Disability (PWD)
            {!canEdit("pwdMember") && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 6, padding: "1px 6px", borderRadius: 4, backgroundColor: "#fce4ec", color: "#c62828", fontSize: 10, fontWeight: 700 }}>
                🔒 Locked by Admin
              </span>
            )}
          </label>
          {person.pwdMember === 1 && (
            <>
              <Field label="PWD Type" required error={errors.pwdType} helperText="This field is required.">
                <MSelect
                  name="pwdType" value={person.pwdType || ""}
                  onChange={canEdit("pwdMember") ? handleChange : undefined}
                  disabled={!canEdit("pwdMember")}
                  locked={!canEdit("pwdMember")}
                  error={errors.pwdType}
                >
                  <option value="">Select PWD Type</option>
                  {["Blindness", "Low-vision", "Leprosy Cured persons", "Hearing Impairment", "Locomotor Disability", "Dwarfism", "Intellectual Disability", "Mental Illness", "Autism Spectrum Disorder", "Cerebral Palsy", "Muscular Dystrophy", "Chronic Neurological conditions", "Specific Learning Disabilities", "Multiple Sclerosis", "Speech and Language disability"].map((v) => <option key={v} value={v}>{v}</option>)}
                </MSelect>
              </Field>
              <Field label="PWD ID" required error={errors.pwdId} helperText="This field is required.">
                <MInput
                  name="pwdId" value={person.pwdId || ""}
                  onChange={canEdit("pwdMember") ? handleChange : undefined}
                  readOnly={!canEdit("pwdMember")}
                  locked={!canEdit("pwdMember")}
                  error={errors.pwdId} placeholder="Enter your PWD ID Number"
                />
              </Field>
            </>
          )}

          {/* Birth Date — system-locked */}
          <div style={S.row}>
            <div style={S.flex1}>
              <Field label="Date of Birth" required error={errors.birthOfDate} helperText="Required">
                <DateField disabled name="birthOfDate" value={person.birthOfDate || ""} onChange={handleChange} style={S.input(errors.birthOfDate)} />
              </Field>
            </div>
            {/* Age — system-locked (auto-computed) */}
            <div style={{ width: 80 }}>
              <Field label="Age" required error={errors.age} helperText="Required">
                <MInput disabled name="age" value={person.age || ""} readOnly placeholder="Age" error={errors.age} style={{ backgroundColor: "#f5f5f5" }} />
              </Field>
            </div>
          </div>

          {/* Birth Place — system-locked */}
          <Field label="Birth Place" required error={errors.birthPlace} helperText="This field is required.">
            <MInput name="birthPlace" value={person.birthPlace || ""} onChange={handleChange} error={errors.birthPlace} placeholder="Enter your Birth Place" />
          </Field>

          {/* Language — admin-controlled */}
          <Field label="Language / Dialect Spoken" required error={errors.languageDialectSpoken} helperText="This field is required." lockedBadge={!canEdit("languageDialectSpoken")}>
            <MInput
              name="languageDialectSpoken" value={person.languageDialectSpoken || ""}
              onChange={canEdit("languageDialectSpoken") ? handleChange : undefined}
              readOnly={!canEdit("languageDialectSpoken")}
              locked={!canEdit("languageDialectSpoken")}
              error={errors.languageDialectSpoken} placeholder="Enter your Language Spoken"
            />
          </Field>

          {/* Citizenship — system-locked */}
          <Field label="Citizenship" required error={errors.citizenship} helperText="This field is required.">
            <MSelect name="citizenship" value={person.citizenship || ""} onChange={handleChange} error={errors.citizenship}>
              <option value="">Select Citizenship</option>
              {["FILIPINO", "AMERICAN", "AUSTRALIAN", "BRITISH", "CANADIAN", "CHINESE", "FRENCH", "GERMAN", "INDIAN", "INDONESIAN", "JAPANESE", "KOREAN", "MALAYSIAN", "SINGAPOREAN", "THAI", "VIETNAMESE", "Others"].map((v) => <option key={v} value={v}>{v}</option>)}
            </MSelect>
          </Field>

          {/* Religion — admin-controlled */}
          <Field label="Religion" required error={errors.religion} helperText="This field is required." lockedBadge={!canEdit("religion")}>
            <MSelect
              name="religion" value={person.religion || ""}
              onChange={canEdit("religion") ? handleChange : undefined}
              disabled={!canEdit("religion")}
              locked={!canEdit("religion")}
              error={errors.religion}
            >
              <option value="">Select Religion</option>
              {["Catholic", "Born Again", "Christian", "Iglesia Ni Cristo", "Baptist", "Adventis", "Islam", "Protestant", "Aglipay", "Seventh Day Adventist", "Jehovah's Witness", "Buddist", "Others", "None"].map((v) => <option key={v} value={v}>{v}</option>)}
            </MSelect>
          </Field>

          <div style={S.row}>
            {/* Civil Status — system-locked */}
            <div style={S.flex1}>
              <Field label="Civil Status" required error={errors.civilStatus} helperText="Required">
                <MSelect name="civilStatus" value={person.civilStatus || ""} onChange={handleChange} error={errors.civilStatus}>
                  <option value="">Select</option>
                  {["Single", "Married", "Legally Seperated", "Widowed", "Solo Parent"].map((v) => <option key={v} value={v}>{v}</option>)}
                </MSelect>
              </Field>
            </div>
            {/* Tribe/Ethnic Group — admin-controlled */}
            <div style={S.flex1}>
              <Field label="Tribe / Ethnic Group" required error={errors.tribeEthnicGroup} helperText="Required" lockedBadge={!canEdit("tribeEthnicGroup")}>
                <MSelect
                  name="tribeEthnicGroup" value={person.tribeEthnicGroup || ""}
                  onChange={canEdit("tribeEthnicGroup") ? handleChange : undefined}
                  disabled={!canEdit("tribeEthnicGroup")}
                  locked={!canEdit("tribeEthnicGroup")}
                  error={errors.tribeEthnicGroup}
                >
                  <option value="">Select</option>
                  {["Agta", "Agutaynen", "Aklanon", "Alangan", "Alta", "Amersian", "Ati", "Atta", "Ayta", "B'laan", "Badjao", "Bagobo", "Balangao", "Balangingi", "Bangon", "Bantoanon", "Banwaon", "Batak", "Bicolano", "Binukid", "Bohalano", "Bolinao", "Bontoc", "Buhid", "Butuanon", "Cagyanen", "Caray-a", "Cebuano", "Cuyunon", "Dasen", "Ilocano", "Ilonggo", "Jamah Mapun", "Malay", "Mangyan", "Maranao", "Molbogs", "Palawano", "Panimusan", "Tagbanua", "Tao't Bato", "Tausug", "Waray", "Others"].map((v) => <option key={v} value={v}>{v}</option>)}
                </MSelect>
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION: Contact Information ─────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}` }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>Contact Information</div>
        <div style={S.cardBody}>

          {/* Contact Number — admin-controlled */}
          <Field label="Contact Number" required error={errors.cellphoneNumber} helperText="This field is required." lockedBadge={!canEdit("cellphoneNumber")}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#444", flexShrink: 0 }}>+63</span>
              <MInput
                name="cellphoneNumber" value={person.cellphoneNumber || ""}
                onChange={canEdit("cellphoneNumber") ? (e) => handleChange({ target: { name: "cellphoneNumber", value: e.target.value.replace(/\D/g, "") } }) : undefined}
                readOnly={!canEdit("cellphoneNumber")}
                locked={!canEdit("cellphoneNumber")}
                error={errors.cellphoneNumber} placeholder="9XXXXXXXXX" maxLength={10}
                style={{ flex: 1 }}
              />
            </div>
          </Field>

          {/* Email — always system-locked */}
          <Field label="Email Address" required error={errors.emailAddress} helperText="This field is required.">
            <MInput name="emailAddress" value={person.emailAddress || ""} readOnly style={{ backgroundColor: "#f0f0f0" }} placeholder="Enter your Email Address" />
          </Field>
        </div>
      </div>

      {/* ── SECTION: Present Address ─────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}`, mb: 2 }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>Present Address</div>
        <div style={S.cardBody}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: { xs: "column", sm: "row" }, gap: 1, backgroundColor: "#FFF4E5", border: "1px solid #FFA726", borderRadius: 2, p: { xs: 1.5, sm: 2 }, minHeight: { xs: "auto", sm: "50px" }, mb: 2, textAlign: "center" }}>
            <WarningAmberIcon sx={{ color: "#FF9800", fontSize: { xs: 28, sm: 24 } }} />
            <Typography fontWeight="medium" color="#BF360C" sx={{ fontSize: { xs: "0.85rem", sm: "1rem" }, lineHeight: 1.5 }}>
              NOTICE: Fill up first the{" "}<strong>REGION <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span> PERMANENT PROVINCE <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span> PERMANENT MUNICIPALITY <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span> PERMANENT BARANGAY</strong>
            </Typography>
          </Box>

          {/* Present Street — system-locked */}
          <Field label="Street / House No." required error={errors.presentStreet} helperText="This field is required.">
            <MInput name="presentStreet" value={person.presentStreet || ""} onChange={handleChange} error={errors.presentStreet} placeholder="Enter your Present Street" />
          </Field>

          {/* Present Zip Code — admin-controlled */}
          <Field label="Zip Code" required error={errors.presentZipCode} helperText="This field is required." lockedBadge={!canEdit("presentZipCode")}>
            <MInput
              type="number" name="presentZipCode" value={person.presentZipCode || ""}
              onChange={canEdit("presentZipCode") ? handleChange : undefined}
              readOnly={!canEdit("presentZipCode")}
              locked={!canEdit("presentZipCode")}
              error={errors.presentZipCode} placeholder="Enter your Zip Code"
            />
          </Field>

          {/* Present Region — admin-controlled */}
          <Field label="Region" required error={errors.presentRegion} helperText="This field is required." lockedBadge={!canEdit("presentRegion")}>
            <MSelect
              name="presentRegion" value={person.presentRegion || ""}
              onChange={canEdit("presentRegion") ? (e) => { handleChange(e); setProvinceList([]); setCityList([]); setBarangayList([]); } : undefined}
              disabled={!canEdit("presentRegion")}
              locked={!canEdit("presentRegion")}
              error={errors.presentRegion}
            >
              <option value="">Select Region</option>
              {regionList.map((r) => <option key={r.region_code} value={r.region_name}>{r.region_name}</option>)}
            </MSelect>
          </Field>

          {/* Present Province — admin-controlled */}
          <Field label="Province" required error={errors.presentProvince} helperText="This field is required." lockedBadge={!canEdit("presentProvince")}>
            <MSelect
              name="presentProvince" value={person.presentProvince || ""}
              onChange={canEdit("presentProvince") ? (e) => { handleChange(e); setCityList([]); setBarangayList([]); } : undefined}
              disabled={!canEdit("presentProvince") || !person.presentRegion}
              locked={!canEdit("presentProvince")}
              error={errors.presentProvince}
            >
              <option value="">Select Province</option>
              {provinceList.map((p) => <option key={p.province_code} value={p.province_name}>{p.province_name}</option>)}
            </MSelect>
          </Field>

          {/* Present Municipality — admin-controlled */}
          <Field label="Municipality / City" required error={errors.presentMunicipality} helperText="This field is required." lockedBadge={!canEdit("presentMunicipality")}>
            <MSelect
              name="presentMunicipality" value={person.presentMunicipality || ""}
              onChange={canEdit("presentMunicipality") ? (e) => { handleChange(e); setBarangayList([]); } : undefined}
              disabled={!canEdit("presentMunicipality") || !person.presentProvince}
              locked={!canEdit("presentMunicipality")}
              error={errors.presentMunicipality}
            >
              <option value="">Select Municipality</option>
              {cityList.map((c) => <option key={c.city_code} value={c.city_name}>{c.city_name}</option>)}
            </MSelect>
          </Field>

          {/* Present Barangay — admin-controlled */}
          <Field label="Barangay" required error={errors.presentBarangay} helperText="This field is required." lockedBadge={!canEdit("presentBarangay")}>
            <MSelect
              name="presentBarangay" value={person.presentBarangay || ""}
              onChange={canEdit("presentBarangay") ? handleChange : undefined}
              disabled={!canEdit("presentBarangay") || !person.presentMunicipality}
              locked={!canEdit("presentBarangay")}
              error={errors.presentBarangay}
            >
              <option value="">Select Barangay</option>
              {barangayList.map((b) => <option key={b.brgy_code} value={b.brgy_name}>{b.brgy_name}</option>)}
            </MSelect>
          </Field>

          <label style={S.checkRow}>
            <input type="checkbox" style={S.checkbox} name="presentDswdChecked" checked={person.presentDswdChecked === 1} onChange={handleChange} />
            I have a Present DSWD Household Number
          </label>

          {/* Present DSWD — admin-controlled */}
          {person.presentDswdChecked === 1 && (
            <Field label="Present DSWD Household Number" required error={errors.presentDswdHouseholdNumber} helperText="This field is required." lockedBadge={!canEdit("presentDswdHouseholdNumber")}>
              <MInput
                name="presentDswdHouseholdNumber" value={person.presentDswdHouseholdNumber || ""}
                onChange={canEdit("presentDswdHouseholdNumber") ? handleChange : undefined}
                readOnly={!canEdit("presentDswdHouseholdNumber")}
                locked={!canEdit("presentDswdHouseholdNumber")}
                error={errors.presentDswdHouseholdNumber} placeholder="Enter your DSWD Household Number"
              />
            </Field>
          )}
        </div>
      </div>

      {/* ── SECTION: Permanent Address ───────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}`, marginBottom: 2 }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>Permanent Address</div>
        <div style={S.cardBody}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: { xs: "column", sm: "row" }, gap: 1, backgroundColor: "#FFF4E5", border: "1px solid #FFA726", borderRadius: 2, p: { xs: 1.5, sm: 2 }, minHeight: { xs: "auto", sm: "50px" }, mb: 3, textAlign: "center" }}>
            <WarningAmberIcon sx={{ color: "#FF9800", fontSize: { xs: 28, sm: 24 } }} />
            <Typography fontWeight="medium" color="#BF360C" sx={{ fontSize: { xs: "0.85rem", sm: "1rem" }, lineHeight: 1.5 }}>
              NOTICE: Fill up first the{" "}<strong>REGION <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span> PERMANENT PROVINCE <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span> PERMANENT MUNICIPALITY <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span> PERMANENT BARANGAY</strong>
            </Typography>
          </Box>

          <label style={S.checkRow}>
            <input
              type="checkbox" style={S.checkbox} name="sameAsPresentAddress" checked={person.sameAsPresentAddress === 1}
              onChange={(e) => {
                const checked = e.target.checked;
                const updatedPerson = { ...person, sameAsPresentAddress: checked ? 1 : 0 };
                if (checked) {
                  updatedPerson.permanentStreet = person.presentStreet;
                  updatedPerson.permanentZipCode = person.presentZipCode;
                  updatedPerson.permanentRegion = person.presentRegion;
                  updatedPerson.permanentProvince = person.presentProvince;
                  updatedPerson.permanentMunicipality = person.presentMunicipality;
                  updatedPerson.permanentBarangay = person.presentBarangay;
                  updatedPerson.permanentDswdHouseholdNumber = person.presentDswdHouseholdNumber;
                  setPermanentRegion(person.presentRegion);
                  setPermanentProvince(person.presentProvince);
                  setPermanentCity(person.presentMunicipality);
                  setPermanentBarangay(person.presentBarangay);
                }
                setPerson(updatedPerson);
                handleUpdate(updatedPerson);
              }}
            />
            Same as Present Address
          </label>

          {/* Permanent Street — system-locked */}
          <Field label="Street / House No." required error={errors.permanentStreet} helperText="This field is required.">
            <MInput name="permanentStreet" value={person.permanentStreet || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.permanentStreet} placeholder="Enter your Permanent Street" />
          </Field>

          {/* Permanent Zip — admin-controlled */}
          <Field label="Zip Code" required error={errors.permanentZipCode} helperText="This field is required." lockedBadge={!canEdit("permanentZipCode")}>
            <MInput
              type="number" name="permanentZipCode" value={person.permanentZipCode || ""}
              onChange={canEdit("permanentZipCode") ? handleChange : undefined}
              readOnly={!canEdit("permanentZipCode")}
              locked={!canEdit("permanentZipCode")}
              error={errors.permanentZipCode} placeholder="Enter your Zip Code"
            />
          </Field>

          {/* Permanent Region — admin-controlled */}
          <Field label="Region" required error={errors.permanentRegion} helperText="This field is required." lockedBadge={!canEdit("permanentRegion")}>
            <MSelect
              name="permanentRegion" value={person.permanentRegion || ""}
              onChange={canEdit("permanentRegion") ? (e) => { handleChange(e); setPermanentRegion(e.target.value); setPermanentProvince(""); setPermanentCity(""); setPermanentBarangay(""); setPermanentProvinceList([]); setPermanentCityList([]); setPermanentBarangayList([]); } : undefined}
              disabled={!canEdit("permanentRegion")}
              locked={!canEdit("permanentRegion")}
              error={errors.permanentRegion}
            >
              <option value="">Select Region</option>
              {permanentRegionList.map((r) => <option key={r.region_code} value={r.region_name}>{r.region_name}</option>)}
            </MSelect>
          </Field>

          {/* Permanent Province — admin-controlled */}
          <Field label="Province" required error={errors.permanentProvince} helperText="This field is required." lockedBadge={!canEdit("permanentProvince")}>
            <MSelect
              name="permanentProvince" value={person.permanentProvince || ""}
              onChange={canEdit("permanentProvince") ? (e) => { handleChange(e); setPermanentProvince(e.target.value); setPermanentCity(""); setPermanentBarangay(""); setPermanentCityList([]); setPermanentBarangayList([]); } : undefined}
              disabled={!canEdit("permanentProvince") || !person.permanentRegion}
              locked={!canEdit("permanentProvince")}
              error={errors.permanentProvince}
            >
              <option value="">Select Province</option>
              {permanentProvinceList.map((p) => <option key={p.province_code} value={p.province_name}>{p.province_name}</option>)}
            </MSelect>
          </Field>

          {/* Permanent Municipality — admin-controlled */}
          <Field label="Municipality / City" required error={errors.permanentMunicipality} helperText="This field is required." lockedBadge={!canEdit("permanentMunicipality")}>
            <MSelect
              name="permanentMunicipality" value={person.permanentMunicipality || ""}
              onChange={canEdit("permanentMunicipality") ? (e) => { handleChange(e); setPermanentCity(e.target.value); setPermanentBarangay(""); setPermanentBarangayList([]); } : undefined}
              disabled={!canEdit("permanentMunicipality") || !person.permanentProvince}
              locked={!canEdit("permanentMunicipality")}
              error={errors.permanentMunicipality}
            >
              <option value="">Select Municipality</option>
              {permanentCityList.map((c) => <option key={c.city_code} value={c.city_name}>{c.city_name}</option>)}
            </MSelect>
          </Field>

          {/* Permanent Barangay — admin-controlled */}
          <Field label="Barangay" required error={errors.permanentBarangay} helperText="This field is required." lockedBadge={!canEdit("permanentBarangay")}>
            <MSelect
              name="permanentBarangay" value={person.permanentBarangay || ""}
              onChange={canEdit("permanentBarangay") ? (e) => { handleChange(e); setPermanentBarangay(e.target.value); } : undefined}
              disabled={!canEdit("permanentBarangay") || !person.permanentMunicipality}
              locked={!canEdit("permanentBarangay")}
              error={errors.permanentBarangay}
            >
              <option value="">Select Barangay</option>
              {permanentBarangayList.map((b) => <option key={b.brgy_code} value={b.brgy_name}>{b.brgy_name}</option>)}
            </MSelect>
          </Field>

          <label style={S.checkRow}>
            <input type="checkbox" style={S.checkbox} name="permanentDswdChecked" checked={person.permanentDswdChecked === 1} onChange={handleChange} />
            I have a Permanent DSWD Household Number
          </label>

          {/* Permanent DSWD — admin-controlled */}
          {person.permanentDswdChecked === 1 && (
            <Field label="Permanent DSWD Household Number" required error={errors.permanentDswdHouseholdNumber} helperText="This field is required." lockedBadge={!canEdit("permanentDswdHouseholdNumber")}>
              <MInput
                name="permanentDswdHouseholdNumber" value={person.permanentDswdHouseholdNumber || ""}
                onChange={canEdit("permanentDswdHouseholdNumber") ? handleChange : undefined}
                readOnly={!canEdit("permanentDswdHouseholdNumber")}
                locked={!canEdit("permanentDswdHouseholdNumber")}
                error={errors.permanentDswdHouseholdNumber} placeholder="Enter your DSWD Household Number"
              />
            </Field>
          )}
        </div>

        {/* Action Buttons */}
        <Box display="flex" justifyContent="flex-end" mt={1} gap={1} mb={3} mr={2}>
          {canEdit("profile_img") && (
            <Button
              variant="contained"
              onClick={() => setUploadModalOpen(true)}
              sx={{ backgroundColor: mainButtonColor || "#6D2323", border: `1px solid ${borderColor || "#6D2323"}`, color: "#fff", textTransform: "none", fontWeight: 600, fontSize: 13, "&:hover": { backgroundColor: "#000" }, display: "flex", alignItems: "center" }}
            >
              <PhotoCameraIcon sx={{ mr: 1, fontSize: 18 }} />
              Upload Photo <br /> Student Picture
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={<ArrowForwardIcon sx={{ color: "#fff" }} />}
            sx={{ backgroundColor: mainButtonColor || "#6D2323", border: `1px solid ${borderColor || "#6D2323"}`, color: "#fff", textTransform: "none", fontWeight: 600, fontSize: 13, "&:hover": { backgroundColor: "#000", color: "#fff", "& .MuiSvgIcon-root": { color: "#fff" } } }}
          >
            Next Step
          </Button>
        </Box>
      </div>
    </div>
  );
};

export default ApplicantDashboard1Mobile;
