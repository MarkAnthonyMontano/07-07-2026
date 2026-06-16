import React, { useState, useEffect, useContext, useRef } from "react";
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
  Typography,
  Card,
  Modal,
  FormControlLabel,
  Checkbox,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ExamPermit from "./ExamPermit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
// ─── Inline mobile-only styles ──────────────────────────────────────────────
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
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

const steps = [
  { label: "Personal Information", icon: <PersonIcon /> },
  { label: "Family Background", icon: <FamilyRestroomIcon /> },
  { label: "Educational Attainment", icon: <SchoolIcon /> },
  { label: "Health Medical Records", icon: <HealthAndSafetyIcon /> },
  { label: "Other Information", icon: <InfoIcon /> },
];

// ─── Reusable field components ────────────────────────────────────────────────
const Field = ({ label, required, error, helperText, children }) => (
  <div style={S.fieldWrap}>
    {label && (
      <label style={S.label}>
        {label}
        {required && <span style={S.required}> *</span>}
      </label>
    )}
    {children}
    {error && helperText && <div style={S.helperError}>{helperText}</div>}
  </div>
);

const MInput = ({ error, style, ...props }) => (
  <input style={{ ...S.input(error), ...style }} {...props} />
);

const MSelect = ({ error, style, children, ...props }) => (
  <select style={{ ...S.select(error), ...style }} {...props}>
    {children}
  </select>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const ApplicantPersonalInformationMobile = () => {
  const settings = useContext(SettingsContext);

  // ── Settings colors & info (from Dashboard1) ──────────────────────────────
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

  useEffect(() => {
    if (!settings) return;
    if (settings.title_color) setTitleColor(settings.title_color);
    if (settings.subtitle_color) setSubtitleColor(settings.subtitle_color);
    if (settings.border_color) setBorderColor(settings.border_color);
    if (settings.main_button_color) setMainButtonColor(settings.main_button_color);
    if (settings.sub_button_color) setSubButtonColor(settings.sub_button_color);
    if (settings.stepper_color) setStepperColor(settings.stepper_color);
    if (settings.logo_url) {
      setFetchedLogo(`${API_BASE_URL}${settings.logo_url}`);
    }
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

  // ── From Dashboard1: getBranchLabel ──────────────────────────────────────
  const getBranchLabel = (branchId) => {
    const branch = branches.find((item) => String(item.id) === String(branchId));
    return branch?.branch || "—";
  };

  const navigate = useNavigate();

  // ── From Dashboard1: state ────────────────────────────────────────────────
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [person, setPerson] = useState({
    profile_img: "",
    campus: "",
    academicProgram: "",
    classifiedAs: "",
    applyingAs: "",
    program: "",
    program2: "",
    program3: "",
    yearLevel: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    extension: "",
    nickname: "",
    height: "",
    weight: "",
    lrnNumber: "",
    nolrnNumber: "",
    gender: "",
    pwdType: "",
    pwdId: "",
    birthOfDate: "",
    age: "",
    birthPlace: "",
    languageDialectSpoken: "",
    citizenship: "",
    religion: "",
    civilStatus: "",
    tribeEthnicGroup: "",
    cellphoneNumber: "",
    emailAddress: "",
    presentStreet: "",
    presentBarangay: "",
    presentZipCode: "",
    presentRegion: "",
    presentProvince: "",
    presentMunicipality: "",
    presentDswdHouseholdNumber: "",
    sameAsPresentAddress: "",
    permanentStreet: "",
    permanentBarangay: "",
    permanentZipCode: "",
    permanentRegion: "",
    permanentProvince: "",
    permanentMunicipality: "",
    permanentDswdHouseholdNumber: "",
  });

  // ── From Dashboard1: yearLevelOptions ────────────────────────────────────
  const [yearLevelOptions, setYearLevelOptions] = useState([]);

  useEffect(() => {
    const fetchYearLevels = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/year-levels`);
        setYearLevelOptions(res.data);
      } catch (err) {
        console.error("Error fetching year levels:", err);
      }
    };
    fetchYearLevels();
  }, []);

  // ── From Dashboard1: getYearLevelSelectValue ──────────────────────────────
  const getYearLevelSelectValue = () => {
    const current = person?.yearLevel;
    if (current === null || current === undefined || current === "") return "";
    const currentText = String(current).trim();
    const byId = yearLevelOptions.find(
      (yl) => String(yl.year_level_id) === currentText,
    );
    if (byId) return String(byId.year_level_id);
    const byDesc = yearLevelOptions.find(
      (yl) =>
        String(yl.year_level_description || "")
          .trim()
          .toLowerCase() === currentText.toLowerCase(),
    );
    if (byDesc) return String(byDesc.year_level_id);
    return currentText;
  };

  // ── From Dashboard1: filteredYearLevels ──────────────────────────────────
  const filteredYearLevels = yearLevelOptions.filter((yl) => {
    if (Number(person.academicProgram) === 1) {
      return yl.level_type === "graduate";
    }
    return yl.level_type === "year";
  });

  // ── From Dashboard1: programAvailability ─────────────────────────────────
  const [programAvailability, setProgramAvailability] = useState([]);
  const [activeYearId, setActiveYearId] = useState(null);
  const [activeSemesterId, setActiveSemesterId] = useState(null);

  useEffect(() => {
    const fetchActiveYearAndAvailability = async () => {
      const yearRes = await axios.get(`${API_BASE_URL}/api/active_school_year`);
      const activeYear = yearRes.data[0];
      if (activeYear) {
        setActiveYearId(activeYear.year_id);
        setActiveSemesterId(activeYear.semester_id);
        const availRes = await axios.get(
          `${API_BASE_URL}/api/programs/availability`,
          {
            params: {
              year_id: activeYear.year_id,
              semester_id: activeYear.semester_id,
            },
          }
        );
        setProgramAvailability(availRes.data);
      }
    };
    fetchActiveYearAndAvailability();
  }, []);

  const availabilityMap = React.useMemo(() => {
    const map = {};
    programAvailability.forEach((p) => {
      map[p.curriculum_id] = {
        remaining: Number(p.remaining),
        isFull: Number(p.remaining) <= 0,
      };
    });
    return map;
  }, [programAvailability]);

  // ── From Dashboard1: snackbar ─────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "warning",
  });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // WITH:
  const showSnackbar = (message, severity = "warning") => {
    setSnackbar({ open: true, message, severity });
  };

  // ── From Dashboard1: localStorage email prefill ───────────────────────────
  useEffect(() => {
    const savedEmail = localStorage.getItem("applicantEmail");
    const savedFirst = localStorage.getItem("first_name");
    const savedLast = localStorage.getItem("last_name");
    const savedMiddle = localStorage.getItem("middle_name");
    const savedBirth = localStorage.getItem("birthOfDate");

    setPerson(prev => ({
      ...prev,
      emailAddress: savedEmail || "",
      first_name: savedFirst || "",
      last_name: savedLast || "",
      middle_name: savedMiddle || "",
      birthOfDate: savedBirth || "",
      age: savedBirth ? calculateAge(savedBirth) : ""
    }));
  }, []);

  useEffect(() => {
    if (person.birthOfDate) {
      setPerson(prev => ({
        ...prev,
        age: calculateAge(prev.birthOfDate)
      }));
    }
  }, [person.birthOfDate]);

  // ── From Dashboard1: auth + person load (do not alter) ───────────────────
  const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");

    if (keys.step1) {
      navigate(`/applicant_personal_information/${keys.step1}`);
    }

    const overrideId = undefined; // no admin override in mobile

    if (overrideId) {
      setUserRole("superadmin");
      setUserID(overrideId);
      fetchPersonData(overrideId);
      return;
    }

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);

      if (storedRole === "applicant") {
        fetchPersonData(storedID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  // ── From Dashboard1: steps with keys ─────────────────────────────────────
  const stepsWithPaths = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/applicant_personal_information/${keys.step1}` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/applicant_family_background/${keys.step2}` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/applicant_educational_attainment/${keys.step3}` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/applicant_health_medical_records/${keys.step4}` },
    { label: "Other Information", icon: <InfoIcon />, path: `/applicant_other_information/${keys.step5}` },
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [clickedSteps, setClickedSteps] = useState(Array(stepsWithPaths.length).fill(false));

  // ── From Dashboard1: fetchPersonData ─────────────────────────────────────
  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);
      setPerson(res.data);
    } catch (error) { }
  };

  // ── From Dashboard1: handleUpdate ─────────────────────────────────────────
  const handleUpdate = async (updatedPerson) => {
    try {
      if (!updatedPerson || Object.keys(updatedPerson).length === 0) {
        console.warn("No data to update — skipping request.");
        return;
      }
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, updatedPerson);
    } catch (error) {
      console.error("Auto-save failed:", error.response?.data || error.message);
    }
  };

  // ── From Dashboard1: parseISODate + getManilaDate + calculateAge ──────────
  const parseISODate = (dateString) => {
    if (!dateString) return null;
    const [y, m, d] = dateString.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const getManilaDate = () => {
    const now = new Date();
    const manilaString = now.toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const [month, day, year] = manilaString.split("/");
    return new Date(`${year}-${month}-${day}`);
  };

  const calculateAge = (birthDateString) => {
    const birthDate = parseISODate(birthDateString);
    if (!birthDate) return "";
    const today = getManilaDate();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
    return age < 0 ? "" : age;
  };

  // ── From Dashboard1: handleChange (full logic) ────────────────────────────
  const handleChange = (e) => {
    const target = e && e.target ? e.target : {};
    const { name, type, checked, value } = target;

    if (name === "program" && person.program && String(value) !== String(person.program)) {
      showSnackbar("Curriculum selected during registration cannot be changed.");
      return;
    }

    const updatedValue =
      type === "checkbox"
        ? checked ? 1 : 0
        : ["first_name", "middle_name", "last_name"].includes(name)
          ? value.toUpperCase()
          : value;

    const updatedPerson = { ...person, [name]: updatedValue };

    if (name === "academicProgram") {
      if (Number(value) === 1) {
        updatedPerson.yearLevel = "Master";
      } else {
        updatedPerson.yearLevel = "";
      }
    }

    if (name === "birthOfDate") {
      updatedPerson.age = calculateAge(value);
    }

    if (name === "classifiedAs" && value === "Freshman (First Year)") {
      updatedPerson.yearLevel = "First Year";
    }

    if (name === "campus" || name === "academicProgram") {
      updatedPerson.program = "";
    }

    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  // ── From Dashboard1: handleBlur / autoSave ────────────────────────────────
  const handleBlur = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, person);
    } catch (err) {
      console.error("Auto-save failed", err);
    }
  };

  const autoSave = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, person);
    } catch (err) {
      console.error("Auto-save failed.");
    }
  };

  // ── From Dashboard1: upload state ─────────────────────────────────────────
  const [uploadedImage, setUploadedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // ── From Dashboard1: handleFileChange ────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    const maxSizeInBytes = 2 * 1024 * 1024;
    if (!validTypes.includes(file.type)) {
      setSnackbar({ open: true, message: "Invalid file type. Please select a JPEG or PNG file.", severity: "error" });
      setSelectedFile(null);
      setPreview(null);
      return;
    }
    if (file.size > maxSizeInBytes) {
      setSnackbar({ open: true, message: "File is too large. Maximum allowed size is 2MB.", severity: "error" });
      setSelectedFile(null);
      setPreview(null);
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const MAX_SIZE = 2 * 1024 * 1024;

  // ── From Dashboard1: handleUpload ─────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) {
      setSnackbar({ open: true, message: "Please select a file first.", severity: "warning" });
      return;
    }
    if (selectedFile.size > MAX_SIZE) {
      setSnackbar({ open: true, message: "File must be 2MB or less.", severity: "error" });
      return;
    }
    const formData = new FormData();
    formData.append("profile_picture", selectedFile);
    formData.append("person_id", userID);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/upload-profile-picture`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const fileName = response.data.filename || response.data.profile_img;
      const updatedPerson = { ...person, profile_img: fileName };
      setPerson(updatedPerson);
      await handleUpdate(updatedPerson);
      setUploadedImage(`${API_BASE_URL}/uploads/${fileName}`);
      setSnackbar({ open: true, message: "Upload successful!", severity: "success" });
      setUploadModalOpen(false);
      setSelectedFile(null);
      setPreview(null);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Upload failed.";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    }
  };

  // ── From Dashboard1: isLrnNA ──────────────────────────────────────────────
  const [isLrnNA, setIsLrnNA] = useState(false);

  // ── From Dashboard1: address states ──────────────────────────────────────
  const [regionList, setRegionList] = useState([]);
  const [provinceList, setProvinceList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [barangayList, setBarangayList] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");

  useEffect(() => { setRegionList(regions); }, []);

  useEffect(() => {
    const region = regions.find((r) => r.region_name === selectedRegion);
    if (region) {
      setProvinceList(provinces.filter((p) => p.region_code === region.region_code));
    } else { setProvinceList([]); }
  }, [selectedRegion]);

  useEffect(() => {
    const province = provinces.find((p) => p.province_name === selectedProvince);
    if (province) {
      setCityList(cities.filter((c) => c.province_code === province.province_code));
    } else { setCityList([]); }
  }, [selectedProvince]);

  useEffect(() => {
    const city = cities.find((c) => c.city_name === selectedCity);
    if (city) {
      setBarangayList(barangays.filter((b) => b.city_code === city.city_code));
    } else { setBarangayList([]); }
  }, [selectedCity]);

  useEffect(() => {
    const region = regions.find((r) => r.region_name === person.presentRegion);
    if (region) {
      setProvinceList(provinces.filter((p) => p.region_code === region.region_code));
    } else { setProvinceList([]); }
  }, [person.presentRegion]);

  useEffect(() => {
    const province = provinces.find((p) => p.province_name === person.presentProvince);
    if (province) {
      setCityList(cities.filter((c) => c.province_code === province.province_code));
    } else { setCityList([]); }
  }, [person.presentProvince]);

  useEffect(() => {
    const city = cities.find((c) => c.city_name === person.presentMunicipality);
    if (city) {
      setBarangayList(barangays.filter((b) => b.city_code === city.city_code));
    } else { setBarangayList([]); }
  }, [person.presentMunicipality]);

  // ── From Dashboard1: permanent address states ─────────────────────────────
  const [permanentRegionList, setPermanentRegionList] = useState([]);
  const [permanentProvinceList, setPermanentProvinceList] = useState([]);
  const [permanentCityList, setPermanentCityList] = useState([]);
  const [permanentBarangayList, setPermanentBarangayList] = useState([]);
  const [permanentRegion, setPermanentRegion] = useState("");
  const [permanentProvince, setPermanentProvince] = useState("");
  const [permanentCity, setPermanentCity] = useState("");
  const [permanentBarangay, setPermanentBarangay] = useState("");

  useEffect(() => { setPermanentRegionList(regions); }, []);

  useEffect(() => {
    const region = regions.find((r) => r.region_name === person.permanentRegion);
    if (region) {
      setPermanentProvinceList(provinces.filter((p) => p.region_code === region.region_code));
    } else { setPermanentProvinceList([]); }
  }, [person.permanentRegion]);

  useEffect(() => {
    const province = provinces.find((p) => p.province_name === person.permanentProvince);
    if (province) {
      setPermanentCityList(cities.filter((c) => c.province_code === province.province_code));
    } else { setPermanentCityList([]); }
  }, [person.permanentProvince]);

  useEffect(() => {
    const city = cities.find((c) => c.city_name === person.permanentMunicipality);
    if (city) {
      setPermanentBarangayList(barangays.filter((b) => b.city_code === city.city_code));
    } else { setPermanentBarangayList([]); }
  }, [person.permanentMunicipality]);

  // ── From Dashboard1: curriculumOptions ───────────────────────────────────
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/applied_program`);
        setCurriculumOptions(response.data);
      } catch (error) {
        console.error("Error fetching curriculum options:", error);
      }
    };
    fetchCurriculums();
  }, []);

  const filteredCurriculum = curriculumOptions.filter((item) => {
    if (person.campus !== "" && person.campus !== null) {
      if (Number(item.components) !== Number(person.campus)) return false;
    }
    if (person.academicProgram !== "" && person.academicProgram !== null) {
      if (Number(item.academic_program) !== Number(person.academicProgram)) return false;
    }
    return true;
  });

  // ── From Dashboard1: errors + isFormValid ─────────────────────────────────
  const [errors, setErrors] = useState({});

  const isFormValid = () => {
    const requiredFields = [
      "campus", "academicProgram", "classifiedAs", "applyingAs", "program",
      "yearLevel", "profile_img", "last_name", "first_name", "height", "weight",
      "gender", "birthOfDate", "age", "birthPlace", "languageDialectSpoken",
      "citizenship", "religion", "civilStatus", "tribeEthnicGroup",
      "cellphoneNumber", "emailAddress", "presentStreet", "presentZipCode",
      "presentRegion", "presentProvince", "presentMunicipality", "presentBarangay",
      "permanentStreet", "permanentZipCode", "permanentRegion", "permanentProvince",
      "permanentMunicipality", "permanentBarangay",
    ];

    let newErrors = {};
    let isValid = true;

    requiredFields.forEach((field) => {
      const value = person[field];
      if (value === null || value === undefined || value === "" || value === "null" || value === "undefined") {
        newErrors[field] = true;
        isValid = false;
      }
    });

    const emailValue = person.emailAddress?.trim();
    const emailPattern = /^[^@]+@[^@]+\.[^@]+$/;
    if (!emailValue || !emailPattern.test(emailValue)) {
      newErrors.emailAddress = true;
      isValid = false;
    }

    if (!isLrnNA) {
      const lrnValue = person.lrnNumber?.toString().trim();
      if (!lrnValue) {
        newErrors.lrnNumber = true;
        isValid = false;
      }
    }

    if (person.presentDswdChecked === 1) {
      const value = person.presentDswdHouseholdNumber?.trim();
      if (!value) { newErrors.presentDswdHouseholdNumber = true; isValid = false; }
    }

    if (person.permanentDswdChecked === 1) {
      const value = person.permanentDswdHouseholdNumber?.trim();
      if (!value) { newErrors.permanentDswdHouseholdNumber = true; isValid = false; }
    }

    if (person.pwdMember === 1) {
      if (!person.pwdType?.toString().trim()) { newErrors.pwdType = true; isValid = false; }
      if (!person.pwdId?.toString().trim()) { newErrors.pwdId = true; isValid = false; }
    }

    setErrors(newErrors);
    return isValid;
  };

  // ── From Dashboard1: print / exam permit ──────────────────────────────────
  const divToPrintRef = useRef();
  const [showPrintView, setShowPrintView] = useState(false);
  const [examPermitError, setExamPermitError] = useState("");
  const [examPermitModalOpen, setExamPermitModalOpen] = useState(false);
  const [canPrintPermit, setCanPrintPermit] = useState(false);

  const handleCloseExamPermitModal = () => {
    setExamPermitModalOpen(false);
    setExamPermitError("");
  };

  const printDiv = () => {
    const divToPrint = divToPrintRef.current;
    if (divToPrint) {
      const newWin = window.open("", "Print-Window");
      newWin.document.open();
      newWin.document.write(`
        <html>
          <head>
            <title>Examination Permit</title>
            <style>
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              .print-container { width: 8.5in; min-height: 11in; margin: auto; background: white; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            </style>
          </head>
          <body onload="window.print(); setTimeout(() => window.close(), 100);">
            <div class="print-container">${divToPrint.innerHTML}</div>
          </body>
        </html>
      `);
      newWin.document.close();
    }
  };

  const handleExamPermitClick = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/verified-exam-applicants`);
      const verified = res.data.some(a => a.person_id === parseInt(userID));
      if (!verified) {
        setExamPermitError("❌ You cannot print the Exam Permit until all required documents are verified.");
        setExamPermitModalOpen(true);
        return;
      }
      setShowPrintView(true);
      setTimeout(() => {
        printDiv();
        setShowPrintView(false);
      }, 500);
    } catch (err) {
      console.error("Error verifying exam permit eligibility:", err);
      setExamPermitError("⚠️ Unable to check document verification status right now.");
      setExamPermitModalOpen(true);
    }
  };

  useEffect(() => {
    if (!userID) return;
    axios
      .get(`${API_BASE_URL}/api/verified-exam-applicants`)
      .then((res) => {
        const verified = res.data.some((a) => a.person_id === parseInt(userID));
        setCanPrintPermit(verified);
      });
  }, [userID]);

  // ── From Dashboard1: links ────────────────────────────────────────────────
  const links = [
    { to: "/ecat_application_form", label: "ECAT Application Form" },
    { to: "/admission_form_process", label: "Admission Form Process" },
    { to: "/personal_data_form", label: "Personal Data Form" },
    { to: "/office_of_the_registrar", label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} College Admission` },
    { to: "/admission_services", label: "Application/Student Satisfactory Survey" },
    { label: "Examination Permit", onClick: handleExamPermitClick },
  ];

  // handleNext — add save message + delay:
  const handleNext = (e) => {
    handleUpdate(person);
    if (isFormValid()) {
      showSnackbar("Your record has been saved successfully!", "success");  // ADD
      setTimeout(() => navigate(`/applicant_family_background/${keys.step2}`), 1000);        // CHANGE
    } else {
      showSnackbar("Please complete all required fields before proceeding.");
    }
  };

  // handleStepClick — add save message + delay:
  const handleStepClick = (index) => {
    if (isFormValid()) {
      setActiveStep(index);
      const newClickedSteps = [...clickedSteps];
      newClickedSteps[index] = true;
      setClickedSteps(newClickedSteps);
      showSnackbar("Your record has been saved successfully!", "success");   // ADD
      setTimeout(() => navigate(stepsWithPaths[index].path), 1000);         // CHANGE
    } else {
      setSnackbar({ open: true, message: "Please fill all required fields before proceeding.", severity: "error" });
    }
  };

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

  // ── Render (mobile UI from StudentDashboard1Mobile) ───────────────────────
  return (
    <div style={S.screen}>

      {/* Hidden print target */}
      {showPrintView && (
        <div ref={divToPrintRef} style={{ display: "block" }}>
          <ExamPermit />
        </div>
      )}

      {/* Snackbar */}
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
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          mx: "12px",
          mt: "12px",
          p: "10px 12px",
          borderRadius: "8px",
          backgroundColor: "#fffaf5",
          border: "1px solid #6D2323",
          boxShadow: "0px 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#800000",
            borderRadius: "6px",
            width: 36,
            height: 36,
            flexShrink: 0,
          }}
        >
          <ErrorIcon sx={{ color: "white", fontSize: 22 }} />
        </Box>

        {/* Text */}
        <Typography sx={{ fontSize: 12, color: "#3e3e3e", lineHeight: 1.6 }}>
          <strong style={{ color: "maroon" }}>Notice:</strong>{" "}
          <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span>
          Please indicate "NA" or "N/A" in fields where the requested information is not applicable or no response can be provided.
          <br />
          <span style={{ marginLeft: 16, fontSize: "1.1em", marginRight: 6 }}>➔</span>
          To enter the letter "Ñ", press and hold the ALT key while typing "165". For "ñ", press and hold the ALT key while typing "164".
        </Typography>
      </Box>

      {/* Printable Documents */}
      <Box sx={{ px: "12px", pt: "12px" }}>
        <Typography
          sx={{
            fontSize: "24px",
            fontWeight: "bold",
            textAlign: "center",
            color: "black",
            marginTop: "20px",
            mb: 2,
          }}
        >
          PRINTABLE DOCUMENTS
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            justifyContent: "center",
          }}
        >
          {links.map((lnk, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              style={{ width: "calc(50% - 4px)" }}
            >
              <Card
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.75,
                  px: 1.5,
                  py: 1.25,
                  height: 52,
                  width: "100%",
                  borderRadius: "12px",
                  border: `1px solid ${borderColor || "#6D2323"}`,
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  transition: "all 0.25s ease-in-out",
                  "&:hover": {
                    backgroundColor: settings?.header_color || "#6D2323",
                    "& .chip-icon": { color: "#fff" },
                    "& .chip-text": { color: "#fff" },
                  },
                }}
                onClick={() => {
                  if (lnk.onClick) {
                    lnk.onClick();
                  } else if (lnk.to) {
                    navigate(lnk.to);
                  }
                }}
              >
                <PictureAsPdfIcon
                  className="chip-icon"
                  sx={{
                    fontSize: 18,
                    color: mainButtonColor || "#6D2323",
                    flexShrink: 0,
                  }}
                />
                <Typography
                  className="chip-text"
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: mainButtonColor || "#6D2323",
                    fontFamily: "Poppins, sans-serif",
                    whiteSpace: "normal",
                    lineHeight: 1.3,
                    textAlign: "center",
                  }}
                >
                  {lnk.label}
                </Typography>
              </Card>
            </motion.div>
          ))}
        </Box>
      </Box>

      {/* Applicant Form Intro */}
      <div style={{ padding: "16px 14px 0", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "bold",
            textAlign: "center",
            color: subtitleColor,
            marginTop: "20px",
          }}
        >
          APPLICANT FORM
        </h1>
        <div style={{ textAlign: "center", fontSize: 13, color: "#555" }}>
          Complete the applicant form to secure your place for the upcoming
          academic year at{" "}
          {shortTerm ? (
            <>
              <strong>{shortTerm.toUpperCase()}</strong>
              <br />
              {companyName || ""}
            </>
          ) : (
            companyName || ""
          )}
          .
        </div>
      </div>

      {/* Stepper */}
      <Box sx={{ display: "flex", justifyContent: "center", width: "100%", px: 2, py: 1.5, borderBottom: "1px solid #e0e0e0" }}>
        {stepsWithPaths.map((step, index) => (
          <React.Fragment key={index}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }} onClick={() => handleStepClick(index)}>
              <Box sx={{
                width: 46, height: 46, borderRadius: "50%", border: `2px solid ${borderColor}`,
                backgroundColor: activeStep === index ? (settings?.header_color || "#6D2323") : "#E8C999",
                color: activeStep === index ? "#fff" : "#333",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transition: "all 0.2s",
              }}>
                {step.icon}
              </Box>
              <Typography sx={{ mt: 0.75, color: activeStep === index ? "#6D2323" : "#555", fontWeight: activeStep === index ? 700 : 400, fontSize: { xs: 10, sm: 12 }, textAlign: "center", maxWidth: 72, lineHeight: 1.3 }}>
                {step.label}
              </Typography>
            </Box>
            {index < stepsWithPaths.length - 1 && (
              <Box sx={{ height: "2px", backgroundColor: mainButtonColor, flex: 1, alignSelf: "center", mx: 1, mb: 3 }} />
            )}
          </React.Fragment>
        ))}
      </Box>

      {/* ── SECTION: Personal Information ─────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}`, }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>
          Personal Information
        </div>

        <div style={S.cardBody}>

          <Field label="Campus" required error={errors.campus} helperText="This field is required.">
            <MSelect
              name="campus"
              value={person.campus || ""}
              onChange={handleChange}
              error={errors.campus}
              disabled
            >
              <option value="">Select Campus</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.branch.toUpperCase()}
                </option>
              ))}
            </MSelect>
          </Field>

          <Field label="Academic Program" required error={errors.academicProgram} helperText="This field is required.">
            <MSelect
              name="academicProgram"
              value={person.academicProgram || ""}
              onChange={handleChange}
              error={errors.academicProgram}
              disabled
            >
              <option value="">Select Program</option>
              <option value="0">Undergraduate</option>
              <option value="1">Graduate</option>
              <option value="2">Techvoc</option>
            </MSelect>
          </Field>

          <Field label="Classified As" required error={errors.classifiedAs} helperText="This field is required.">
            <MSelect
              name="classifiedAs"
              value={person.classifiedAs || ""}
              onChange={handleChange}
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

          <Field label="Applying As" required error={errors.applyingAs} helperText="This field is required.">
            <MSelect
              name="applyingAs"
              value={person.applyingAs || ""}
              onChange={handleChange}
              error={errors.applyingAs}
              disabled
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
      <div style={{ ...S.card, border: `1px solid ${borderColor}`, }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}>
          Course Program
        </div>

        <div style={S.cardBody}>

          {/* Profile Photo */}
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>
              Student Photo <span style={S.required}>*</span>
            </label>

            <div
              style={{
                ...S.profileBox(errors.profile_img),
                cursor: "not-allowed",
                opacity: 0.8,
                pointerEvents: "none",
              }}
            >
              {person.profile_img ? (
                <img
                  src={`${API_BASE_URL}/uploads/Applicant1by1/${person.profile_img}?t=${Date.now()}`}
                  alt="Profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <>
                  <div style={{ fontSize: 32 }}>📷</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: errors.profile_img ? "#d32f2f" : "#888",
                      textAlign: "center",
                      padding: "0 8px",
                    }}
                  >
                    No photo uploaded
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Course Applied */}
          <Field label="Course Applied" required error={errors.program} helperText="This field is required.">
            <MSelect
              name="program"
              value={person.program || ""}
              onChange={handleChange}
              error={errors.program}
              disabled
            >
              <option value="">Select Program</option>

              {filteredCurriculum.map((item, index) => {
                const availability = availabilityMap[item.curriculum_id];
                const remaining = availability?.remaining ?? 0;
                const isFull = availability?.isFull;

                return (
                  <option
                    key={index}
                    value={item.curriculum_id}
                    disabled
                    style={{ color: isFull ? "red" : "inherit" }}
                  >
                    ({item.program_code}): {item.program_description}
                    {item.major ? ` (${item.major})` : ""} ({getBranchLabel(item.components)})
                    {isFull ? " — FULL (0 slots left)" : ` (${remaining} slots left)`}
                  </option>
                );
              })}
            </MSelect>

            {person.program && !errors.program && (
              <div style={{ ...S.helperError, color: "#d32f2f" }}>
                Curriculum was selected during registration and cannot be changed.
              </div>
            )}
          </Field>


          {/* Year Level */}
          <Field label="Year Level" required error={errors.yearLevel} helperText="This field is required.">
            <MSelect name="yearLevel" value={getYearLevelSelectValue()} onChange={handleChange} error={errors.yearLevel}>
              <option value="">Select Year Level</option>
              {filteredYearLevels.map((yl) => (
                <option key={yl.year_level_id} value={String(yl.year_level_id)}>
                  {yl.year_level_description}
                </option>
              ))}
            </MSelect>
          </Field>
        </div>
      </div>

      {/* ── SECTION: Person Details ───────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}`, }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}> Person Details</div>
        <div style={S.cardBody}>

          <Field label="Last Name" required error={errors.last_name} helperText="This field is required.">
            <MInput disabled name="last_name" value={(person.last_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "last_name", value: e.target.value.toUpperCase() } })} error={errors.last_name} placeholder="Enter your Last Name" />
          </Field>

          <Field label="First Name" required error={errors.first_name} helperText="This field is required.">
            <MInput disabled name="first_name" value={(person.first_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "first_name", value: e.target.value.toUpperCase() } })} error={errors.first_name} placeholder="Enter your First Name" />
          </Field>

          <div style={S.row}>
            <div style={S.flex1}>
              <Field label="Middle Name">
                <MInput disabled name="middle_name" value={(person.middle_name || "").toUpperCase()} onChange={(e) => handleChange({ target: { name: "middle_name", value: e.target.value.toUpperCase() } })} placeholder="Enter your Middle Name" />
              </Field>
            </div>
            <div style={{ width: 110 }}>
              <Field label="Extension">
                <MSelect name="extension" value={person.extension || ""} onChange={handleChange}>
                  <option value="">None</option>
                  {["Jr.", "Sr.", "I", "II", "III", "IV", "V"].map((v) => <option key={v} value={v}>{v}</option>)}
                </MSelect>
              </Field>
            </div>
          </div>

          <Field label="Nickname">
            <MInput name="nickname" value={person.nickname || ""} onChange={handleChange} placeholder="Enter your Nickname" />
          </Field>

          <div style={S.row}>
            <div style={S.flex1}>
              <Field label="Height (cm)" required error={errors.height} helperText="Required">
                <MInput type="number" name="height" value={person.height || ""} onChange={handleChange} error={errors.height} placeholder="Enter your Height" />
              </Field>
            </div>
            <div style={S.flex1}>
              <Field label="Weight (kg)" required error={errors.weight} helperText="Required">
                <MInput type="number" name="weight" value={person.weight || ""} onChange={handleChange} error={errors.weight} placeholder="Enter your Weight" />
              </Field>
            </div>
          </div>

          {/* LRN */}
          <Field label="Learning Reference Number (LRN)" required={!isLrnNA} error={errors.lrnNumber} helperText="This field is required.">
            <MInput
              name="lrnNumber"
              value={person.lrnNumber === "No LRN Number" ? "" : person.lrnNumber || ""}
              onChange={handleChange}
              onBlur={() => handleUpdate(person)}
              disabled={person.lrnNumber === "No LRN Number"}
              error={errors.lrnNumber}
              placeholder="Enter your LRN Number"
              style={{ opacity: person.lrnNumber === "No LRN Number" ? 0.5 : 1 }}
            />
            <label style={{ ...S.checkRow, marginTop: 6 }}>
              <input
                type="checkbox"
                style={S.checkbox}
                checked={person.lrnNumber === "No LRN Number"}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const updatedPerson = { ...person, lrnNumber: checked ? "No LRN Number" : "" };
                  setPerson(updatedPerson);
                  setIsLrnNA(checked);
                  handleUpdate(updatedPerson);
                }}
              />
              N/A — No LRN Number
            </label>
          </Field>

          {/* Gender */}
          <Field label="Sex / Gender" required error={errors.gender} helperText="This field is required.">
            <MSelect
              name="gender"
              value={person.gender == null ? "" : String(person.gender)}
              onChange={(e) => handleChange({ target: { name: "gender", value: e.target.value === "" ? null : parseInt(e.target.value, 10) } })}
              error={errors.gender}
            >
              <option value="">Select Gender</option>
              <option value="0">MALE</option>
              <option value="1">FEMALE</option>
            </MSelect>
          </Field>

          {/* PWD */}
          <label style={S.checkRow}>
            <input
              type="checkbox"
              style={S.checkbox}
              checked={person.pwdMember === 1}
              onChange={(e) => {
                const checked = e.target.checked;
                setPerson((prev) => ({ ...prev, pwdMember: checked ? 1 : 0, pwdType: checked ? prev.pwdType || "" : "", pwdId: checked ? prev.pwdId || "" : "" }));
              }}
            />
            Person with Disability (PWD)
          </label>
          {person.pwdMember === 1 && (
            <>
              <Field label="PWD Type" required error={errors.pwdType} helperText="This field is required.">
                <MSelect name="pwdType" value={person.pwdType || ""} onChange={handleChange} error={errors.pwdType}>
                  <option value="">Select PWD Type</option>
                  {["Blindness", "Low-vision", "Leprosy Cured persons", "Hearing Impairment", "Locomotor Disability", "Dwarfism", "Intellectual Disability", "Mental Illness", "Autism Spectrum Disorder", "Cerebral Palsy", "Muscular Dystrophy", "Chronic Neurological conditions", "Specific Learning Disabilities", "Multiple Sclerosis", "Speech and Language disability", "Thalassemia", "Hemophilia", "Sickle cell disease", "Multiple Disabilities including"].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </MSelect>
              </Field>
              <Field label="PWD ID" required error={errors.pwdId} helperText="This field is required.">
                <MInput name="pwdId" value={person.pwdId || ""} onChange={handleChange} error={errors.pwdId} placeholder="Enter your PWD ID Number" />
              </Field>
            </>
          )}

          {/* Birth info */}
          <div style={S.row}>
            <div style={S.flex1}>
              <Field label="Date of Birth" required error={errors.birthOfDate} helperText="Required">
                <DateField
                  name="birthOfDate"
                  value={person.birthOfDate || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  style={S.input(errors.birthOfDate)}
                />
              </Field>
            </div>
            <div style={{ width: 80 }}>
              <Field label="Age" required error={errors.age} helperText="Required">
                <MInput name="age" value={person.age || ""} readOnly placeholder="Enter your Age" error={errors.age} style={{ backgroundColor: "#f5f5f5" }} />
              </Field>
            </div>
          </div>

          <Field label="Birth Place" required error={errors.birthPlace} helperText="This field is required.">
            <MInput name="birthPlace" value={person.birthPlace || ""} onChange={handleChange} onBlur={handleBlur} error={errors.birthPlace} placeholder="Enter your Birth Place" />
          </Field>

          <Field label="Language / Dialect Spoken" required error={errors.languageDialectSpoken} helperText="This field is required.">
            <MInput name="languageDialectSpoken" value={person.languageDialectSpoken || ""} onChange={handleChange} onBlur={handleBlur} error={errors.languageDialectSpoken} placeholder="Enter your Language Spoken" />
          </Field>

          <Field label="Citizenship" required error={errors.citizenship} helperText="This field is required.">
            <MSelect name="citizenship" value={person.citizenship || ""} onChange={handleChange} error={errors.citizenship}>
              <option value="">Select Citizenship</option>
              {["AFGHAN", "ALBANIAN", "ARAB", "ARGENTINIAN", "AUSTRALIAN", "AUSTRIAN", "BELGIAN", "BANGLADESHI", "BAHAMIAN", "BHUTANESE", "BERMUDAN", "BOLIVIAN", "BRAZILIAN", "BRUNEI", "BOTSWANIAN", "CANADIAN", "CHILE", "CHINESE", "COLOMBIAN", "COSTA RICAN", "CUBAN", "CYPRIOT", "CZECH", "DANISH", "DOMINICAN", "ALGERIAN", "EGYPTIAN", "SPANISH", "ESTONIAN", "ETHIOPIAN", "FIJI", "FILIPINO", "FINISH", "FRENCH", "BRITISH", "GERMAN", "GHANAIAN", "GREEK", "GUAMANIAN", "GUATEMALAN", "HONG KONG", "CROATIAN", "HAITIAN", "HUNGARIAN", "INDONESIAN", "INDIAN", "IRANIAN", "IRAQI", "IRISH", "ICELANDER", "ISRAELI", "ITALIAN", "JAMAICAN", "JORDANIAN", "JAPANESE", "CAMBODIAN", "KOREAN", "KUWAITI", "KENYAN", "LAOTIAN", "LEBANESE", "LIBYAN", "LUXEMBURGER", "MALAYSIAN", "MOROCCAN", "MEXICAN", "BURMESE", "MYANMAR", "NIGERIAN", "NOT INDICATED", "DUTCH", "NORWEGIAN", "NEPALI", "NEW ZEALANDER", "OMANI", "PAKISTANI", "PANAMANIAN", "PERUVIAN", "PAPUAN", "POLISH", "PUERTO RICAN", "PORTUGUESE", "PARAGUAYAN", "PALESTINIAN", "QATARI", "ROMANIAN", "RUSSIAN", "RWANDAN", "SAUDI ARABIAN", "SUDANESE", "SINGAPOREAN", "SRI LANKAN", "EL SALVADORIAN", "SOMALIAN", "SLOVAK", "SWEDISH", "SWISS", "SYRIAN", "THAI", "TRINIDAD AND TOBAGO", "TUNISIAN", "TURKISH", "TAIWANESE", "UKRAINIAN", "URUGUYAN", "UNITED STATES", "VENEZUELAN", "VIRGIN ISLANDS", "VIETNAMESE", "YEMENI", "YUGOSLAVIAN", "SOUTH AFRICAN", "ZAIREAN", "ZIMBABWEAN", "Others"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </MSelect>
          </Field>

          <Field label="Religion" required error={errors.religion} helperText="This field is required.">
            <MSelect name="religion" value={person.religion || ""} onChange={handleChange} error={errors.religion}>
              <option value="">Select Religion</option>
              {["Jehovah's Witness", "Buddist", "Catholic", "Dating Daan", "Pagano", "Atheist", "Born Again", "Adventis", "Baptist", "Mormons", "Free Methodist", "Christian", "Protestant", "Aglipay", "Islam", "LDS", "Seventh Day Adventist", "Iglesia Ni Cristo", "UCCP", "PMCC", "Baha'i Faith", "None", "Others"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </MSelect>
          </Field>

          <div style={S.row}>
            <div style={S.flex1}>
              <Field label="Civil Status" required error={errors.civilStatus} helperText="Required">
                <MSelect name="civilStatus" value={person.civilStatus || ""} onChange={handleChange} error={errors.civilStatus}>
                  <option value="">Select</option>
                  {["Single", "Married", "Legally Seperated", "Widowed", "Solo Parent"].map((v) => <option key={v} value={v}>{v}</option>)}
                </MSelect>
              </Field>
            </div>
            <div style={S.flex1}>
              <Field label="Tribe / Ethnic Group" required error={errors.tribeEthnicGroup} helperText="Required">
                <MSelect name="tribeEthnicGroup" value={person.tribeEthnicGroup || ""} onChange={handleChange} error={errors.tribeEthnicGroup}>
                  <option value="">Select</option>
                  {["Agta", "Agutaynen", "Aklanon", "Alangan", "Alta", "Amersian", "Ati", "Atta", "Ayta", "B'laan", "Badjao", "Bagobo", "Balangao", "Balangingi", "Bangon", "Bantoanon", "Banwaon", "Batak", "Bicolano", "Binukid", "Bohalano", "Bolinao", "Bontoc", "Buhid", "Butuanon", "Cagyanen", "Caray-a", "Cebuano", "Cuyunon", "Dasen", "Ilocano", "Ilonggo", "Jamah Mapun", "Malay", "Mangyan", "Maranao", "Molbogs", "Palawano", "Panimusan", "Tagbanua", "Tao't", "Bato", "Tausug", "Waray", "None", "Others"].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </MSelect>
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION: Contact Information ─────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}`, }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}> Contact Information</div>
        <div style={S.cardBody}>
          <Field label="Contact Number" required error={errors.cellphoneNumber} helperText="This field is required.">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#444", flexShrink: 0 }}>+63</span>
              <MInput
                name="cellphoneNumber"
                value={person.cellphoneNumber || ""}
                onChange={(e) => handleChange({ target: { name: "cellphoneNumber", value: e.target.value.replace(/\D/g, "") } })}
                onBlur={() => handleUpdate(person)}
                error={errors.cellphoneNumber}
                placeholder="9XXXXXXXXX"
                maxLength={10}
                style={{ flex: 1 }}
              />
            </div>
          </Field>

          <Field label="Email Address" required error={errors.emailAddress} helperText="This field is required.">
            <MInput
              name="emailAddress"
              value={person.emailAddress || ""}
              readOnly
              style={{ backgroundColor: "#f0f0f0" }}
              placeholder="Enter your Email Address"
            />
          </Field>
        </div>
      </div>

      {/* ── SECTION: Present Address ─────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}`, }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}> Present Address</div>
        <div style={S.cardBody}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: {
                xs: "column",
                sm: "row",
              },
              gap: 1,
              backgroundColor: "#FFF4E5",
              border: "1px solid #FFA726",
              borderRadius: 2,
              p: {
                xs: 1.5,
                sm: 2,
              },
              minHeight: {
                xs: "auto",
                sm: "50px",
              },
              mb: 2,
              textAlign: "center",
            }}
          >
            <WarningAmberIcon
              sx={{
                color: "#FF9800",
                fontSize: {
                  xs: 28,
                  sm: 24,
                },
              }}
            />

            <Typography
              fontWeight="medium"
              color="#BF360C"
              sx={{
                fontSize: {
                  xs: "0.85rem",
                  sm: "1rem",
                },
                lineHeight: 1.5,
              }}
            >
              NOTICE: Fill up first the{" "}
              <strong>
                REGION{" "}
                <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span>
                PERMANENT PROVINCE{" "}
                <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span>
                PERMANENT MUNICIPALITY{" "}
                <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span>
                PERMANENT BARANGAY
              </strong>
            </Typography>
          </Box>
          <Field label="Street / House No." required error={errors.presentStreet} helperText="This field is required.">
            <MInput name="presentStreet" value={person.presentStreet || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.presentStreet} placeholder="Enter your Present Street" />
          </Field>

          <Field label="Zip Code" required error={errors.presentZipCode} helperText="This field is required.">
            <MInput type="number" name="presentZipCode" value={person.presentZipCode || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.presentZipCode} placeholder="Enter your Zip Code" />
          </Field>

          <Field label="Region" required error={errors.presentRegion} helperText="This field is required.">
            <MSelect
              name="presentRegion"
              value={person.presentRegion || ""}
              onChange={(e) => {
                handleChange(e);
                setSelectedRegion(e.target.value);
                setSelectedProvince(""); setSelectedCity(""); setSelectedBarangay("");
                setProvinceList([]); setCityList([]); setBarangayList([]);
                autoSave();
              }}
              error={errors.presentRegion}
            >
              <option value="">Select Region</option>
              {regionList.map((r) => <option key={r.region_code} value={r.region_name}>{r.region_name}</option>)}
            </MSelect>
          </Field>

          <Field label="Province" required error={errors.presentProvince} helperText="This field is required.">
            <MSelect
              name="presentProvince"
              value={person.presentProvince || ""}
              onChange={(e) => {
                handleChange(e);
                setSelectedProvince(e.target.value);
                setSelectedCity(""); setSelectedBarangay("");
                setCityList([]); setBarangayList([]);
                autoSave();
              }}
              disabled={!person.presentRegion}
              error={errors.presentProvince}
            >
              <option value="">Select Province</option>
              {provinceList.map((p) => <option key={p.province_code} value={p.province_name}>{p.province_name}</option>)}
            </MSelect>
          </Field>

          <Field label="Municipality / City" required error={errors.presentMunicipality} helperText="This field is required.">
            <MSelect
              name="presentMunicipality"
              value={person.presentMunicipality || ""}
              onChange={(e) => {
                handleChange(e);
                setSelectedCity(e.target.value);
                setSelectedBarangay(""); setBarangayList([]);
                autoSave();
              }}
              disabled={!person.presentProvince}
              error={errors.presentMunicipality}
            >
              <option value="">Select Municipality</option>
              {cityList.map((c) => <option key={c.city_code} value={c.city_name}>{c.city_name}</option>)}
            </MSelect>
          </Field>

          <Field label="Barangay" required error={errors.presentBarangay} helperText="This field is required.">
            <MSelect
              name="presentBarangay"
              value={person.presentBarangay || ""}
              onChange={(e) => { handleChange(e); setSelectedBarangay(e.target.value); autoSave(); }}
              disabled={!person.presentMunicipality}
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
          {person.presentDswdChecked === 1 && (
            <Field label="Present DSWD Household Number" required error={errors.presentDswdHouseholdNumber} helperText="This field is required.">
              <MInput name="presentDswdHouseholdNumber" value={person.presentDswdHouseholdNumber || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.presentDswdHouseholdNumber} placeholder="Enter your DSWD Household Number" />
            </Field>
          )}
        </div>
      </div>

      {/* ── SECTION: Permanent Address ───────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}`, }}>
        <div style={{ ...S.cardHeader, backgroundColor: settings?.header_color || "#1976d2" }}> Permanent Address</div>
        <div style={S.cardBody}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: {
                xs: "column",
                sm: "row",
              },
              gap: 1,
              backgroundColor: "#FFF4E5",
              border: "1px solid #FFA726",
              borderRadius: 2,
              p: {
                xs: 1.5,
                sm: 2,
              },
              minHeight: {
                xs: "auto",
                sm: "50px",
              },
              mb: 2,
              textAlign: "center",
            }}
          >
            <WarningAmberIcon
              sx={{
                color: "#FF9800",
                fontSize: {
                  xs: 28,
                  sm: 24,
                },
              }}
            />

            <Typography
              fontWeight="medium"
              color="#BF360C"
              sx={{
                fontSize: {
                  xs: "0.85rem",
                  sm: "1rem",
                },
                lineHeight: 1.5,
              }}
            >
              NOTICE: Fill up first the{" "}
              <strong>
                REGION{" "}
                <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span>
                PERMANENT PROVINCE{" "}
                <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span>
                PERMANENT MUNICIPALITY{" "}
                <span style={{ fontSize: "1.1em", margin: "0 6px" }}>➔</span>
                PERMANENT BARANGAY
              </strong>
            </Typography>
          </Box>
          {/* From Dashboard1: sameAsPresentAddress logic */}
          <label style={S.checkRow}>
            <input
              type="checkbox"
              style={S.checkbox}
              name="sameAsPresentAddress"
              checked={person.sameAsPresentAddress === 1}
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

          <Field label="Street / House No." required error={errors.permanentStreet} helperText="This field is required.">
            <MInput name="permanentStreet" value={person.permanentStreet || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.permanentStreet} placeholder="Enter your Permanent Street" />
          </Field>

          <Field label="Zip Code" required error={errors.permanentZipCode} helperText="This field is required.">
            <MInput type="number" name="permanentZipCode" value={person.permanentZipCode || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.permanentZipCode} placeholder="Enter your Zip Code" />
          </Field>

          <Field label="Region" required error={errors.permanentRegion} helperText="This field is required.">
            <MSelect
              name="permanentRegion"
              value={person.permanentRegion || ""}
              onChange={(e) => {
                handleChange(e);
                setPermanentRegion(e.target.value);
                setPermanentProvince(""); setPermanentCity(""); setPermanentBarangay("");
                setPermanentProvinceList([]); setPermanentCityList([]); setPermanentBarangayList([]);
                autoSave();
              }}
              error={errors.permanentRegion}
            >
              <option value="">Select Region</option>
              {permanentRegionList.map((r) => <option key={r.region_code} value={r.region_name}>{r.region_name}</option>)}
            </MSelect>
          </Field>

          <Field label="Province" required error={errors.permanentProvince} helperText="This field is required.">
            <MSelect
              name="permanentProvince"
              value={person.permanentProvince || ""}
              onChange={(e) => {
                handleChange(e);
                setPermanentProvince(e.target.value);
                setPermanentCity(""); setPermanentBarangay("");
                setPermanentCityList([]); setPermanentBarangayList([]);
                autoSave();
              }}
              disabled={!person.permanentRegion}
              error={errors.permanentProvince}
            >
              <option value="">Select Province</option>
              {permanentProvinceList.map((p) => <option key={p.province_code} value={p.province_name}>{p.province_name}</option>)}
            </MSelect>
          </Field>

          <Field label="Municipality / City" required error={errors.permanentMunicipality} helperText="This field is required.">
            <MSelect
              name="permanentMunicipality"
              value={person.permanentMunicipality || ""}
              onChange={(e) => {
                handleChange(e);
                setPermanentCity(e.target.value);
                setPermanentBarangay(""); setPermanentBarangayList([]);
                autoSave();
              }}
              disabled={!person.permanentProvince}
              error={errors.permanentMunicipality}
            >
              <option value="">Select Municipality</option>
              {permanentCityList.map((c) => <option key={c.city_code} value={c.city_name}>{c.city_name}</option>)}
            </MSelect>
          </Field>

          <Field label="Barangay" required error={errors.permanentBarangay} helperText="This field is required.">
            <MSelect
              name="permanentBarangay"
              value={person.permanentBarangay || ""}
              onChange={(e) => { handleChange(e); setPermanentBarangay(e.target.value); autoSave(); }}
              disabled={!person.permanentMunicipality}
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
          {person.permanentDswdChecked === 1 && (
            <Field label="Permanent DSWD Household Number" required error={errors.permanentDswdHouseholdNumber} helperText="This field is required.">
              <MInput name="permanentDswdHouseholdNumber" value={person.permanentDswdHouseholdNumber || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.permanentDswdHouseholdNumber} placeholder="Enter your DSWD Household Number" />
            </Field>
          )}
        </div>

        {/* Action Buttons */}
        <Box display="flex" justifyContent="flex-end" mt={1} gap={1} mb={3} mr={2}>
          <Button
            variant="contained"
            onClick={() => setUploadModalOpen(true)}
            sx={{
              backgroundColor: mainButtonColor || "#6D2323",
              border: `1px solid ${borderColor || "#6D2323"}`,
              color: "#fff",
              textTransform: "none",
              fontWeight: 600,
              fontSize: 13,
              "&:hover": { backgroundColor: "#000" },
              display: "flex",
              alignItems: "center",
            }}
          >
            <PhotoCameraIcon sx={{ mr: 1, fontSize: 18 }} />
            Upload Photo <br /> Student Picture
          </Button>

          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={<ArrowForwardIcon sx={{ color: "#fff" }} />}
            sx={{
              backgroundColor: mainButtonColor || "#6D2323",
              border: `1px solid ${borderColor || "#6D2323"}`,
              color: "#fff",
              textTransform: "none",
              fontWeight: 600,
              fontSize: 13,
              "&:hover": { backgroundColor: "#000", color: "#fff", "& .MuiSvgIcon-root": { color: "#fff" } },
            }}
          >
            Next Step
          </Button>
        </Box>
      </div>

      {/* ── Photo Upload Modal ────────────────────────────────────────── */}
      {uploadModalOpen && (
        <div
          style={S.overlay}
          onClick={(e) => { if (e.target === e.currentTarget) { setUploadModalOpen(false); setPreview(null); setSelectedFile(null); } }}
        >
          <div style={{ backgroundColor: "#fff", borderRadius: 12, width: "92%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", padding: 20, position: "relative", margin: "auto" }}>
            <IconButton
              size="small"
              onClick={() => { setUploadModalOpen(false); setPreview(null); setSelectedFile(null); }}
              sx={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, backgroundColor: "#000", color: "#fff", border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.25)", zIndex: 10 }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>

            <div style={{ backgroundColor: settings?.header_color || "#1976d2", color: "#fff", borderRadius: 8, padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
              Upload Your Photo
            </div>

            {(preview || person.profile_img) && (
              <div style={{ position: "relative", width: 160, margin: "0 auto 16px" }}>
                <img
                  src={preview || `${API_BASE_URL}/uploads/Applicant1by1/${person.profile_img}`}
                  alt="Preview"
                  style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 8, border: "2px solid #6D2323", display: "block" }}
                />
                <IconButton
                  size="small"
                  onClick={async () => {
                    setSelectedFile(null);
                    setPreview(null);
                    const updated = { ...person, profile_img: "" };
                    setPerson(updated);
                    await handleUpdate(updated);
                    setSnackbar({ open: true, message: "Image removed successfully.", severity: "info" });
                  }}
                  sx={{ position: "absolute", top: -10, right: -10, width: 28, height: 28, backgroundColor: "#000", color: "#fff", border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </div>
            )}

            <div style={{ border: "1px dashed #ccc", borderRadius: 8, padding: "12px 14px", marginBottom: 16, backgroundColor: "#f9f9f9", fontSize: 12, color: "#444", lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Guidelines:</div>
              {["Size: 2\" x 2\"", "Color: Your photo must be in colored.", "Background: White.", "Head size and position: Look directly into the camera at a straight angle, face centered.", "File types: JPEG, JPG, PNG", "Attire must be formal.", "Required File Size: 2MB"].map((g, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                  <span style={{ color: "#6D2323", fontWeight: 700, flexShrink: 0 }}>•</span>
                  <span>{g}</span>
                </div>
              ))}
              <div style={{ fontWeight: 700, fontSize: 13, margin: "10px 0 6px" }}>How to Change the Photo?</div>
              {["Tap the × button to remove the current photo", "Choose a new file", "Tap the Upload button"].map((g, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                  <span style={{ color: "#6D2323", fontWeight: 700, flexShrink: 0 }}>•</span>
                  <span>{g}</span>
                </div>
              ))}
            </div>

            <div style={{ fontWeight: 700, fontSize: 13, color: "#6D2323", marginBottom: 6 }}>Select Your Image:</div>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileChange}
              onClick={(e) => (e.target.value = null)}
              style={{ display: "block", width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: 6, marginBottom: 14, fontSize: 13, boxSizing: "border-box" }}
            />
            <button style={{ ...S.btnPrimary, width: "100%", backgroundColor: mainButtonColor }} onClick={handleUpload}>
              Upload
            </button>
          </div>
        </div>
      )}

      {/* ── Exam Permit Error Modal ───────────────────────────────────── */}
      <Modal open={examPermitModalOpen} onClose={handleCloseExamPermitModal}>
        <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 340, bgcolor: "background.paper", border: `1px solid ${borderColor}`, boxShadow: 24, p: 4, borderRadius: 2, textAlign: "center" }}>
          <ErrorIcon sx={{ color: mainButtonColor, fontSize: 50, mb: 2 }} />
          <Typography variant="h6" component="h2" color="maroon">Exam Permit Notice</Typography>
          <Typography sx={{ mt: 2 }}>{examPermitError}</Typography>
          <Button onClick={handleCloseExamPermitModal} variant="contained" sx={{ mt: 3, backgroundColor: mainButtonColor, "&:hover": { backgroundColor: "#8B0000" } }}>
            Close
          </Button>
        </Box>
      </Modal>
    </div>
  );
};

export default ApplicantPersonalInformationMobile;