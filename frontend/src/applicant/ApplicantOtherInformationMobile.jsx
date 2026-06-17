import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Button,
  Box,
  Container,
  Typography,
  Card,
  Modal,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Checkbox,
  Snackbar,
  Alert
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FolderIcon from "@mui/icons-material/Folder";
import ErrorIcon from "@mui/icons-material/Error";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ExamPermit from "./ExamPermit";
import API_BASE_URL from "../apiConfig";

// ─── Style tokens (from StudentDashboard5Mobile) ──────────────────────────────
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
          : "#e65100",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: 24,
    fontSize: 13,
    boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
    maxWidth: "90vw",
    textAlign: "center",
  }),
  consentBox: {
    backgroundColor: "#fafafa",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: "14px",
  },
  consentText: {
    fontSize: 12,
    color: "#444",
    lineHeight: 1.7,
    marginBottom: 10,
  },
  agreeRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff3f3",
    border: "1px solid #6D2323",
    borderRadius: 8,
    padding: "12px 14px",
    marginTop: 16,
  },
  agreeLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#6D2323",
    flex: 1,
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 11,
    marginTop: 6,
    paddingLeft: 4,
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ApplicantOtherInformationMobile = (props) => {
  const settings = useContext(SettingsContext);
  const navigate = useNavigate();

  // ── Theme state (from Dashboard5) ──────────────────────────────────────────
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");

  // ── User / person state (from Dashboard5) ──────────────────────────────────
  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [person, setPerson] = useState({ termsOfAgreement: "" });
  const [errors, setErrors] = useState({});

  // ── Active school year (from Dashboard5) ───────────────────────────────────
  const [activeYearId, setActiveYearId] = useState(null);
  const [activeSemesterId, setActiveSemesterId] = useState(null);

  // ── Exam permit state (from Dashboard5) ────────────────────────────────────
  const divToPrintRef = useRef();
  const [showPrintView, setShowPrintView] = useState(false);
  const [examPermitError, setExamPermitError] = useState("");
  const [examPermitModalOpen, setExamPermitModalOpen] = useState(false);
  const [canPrintPermit, setCanPrintPermit] = useState(false);

  // ── Snackbar (from StudentDashboard5Mobile) ─────────────────────────────────
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "warning",
  });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const showSnackbar = (message, severity = "warning") => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => setSnackbar((p) => ({ ...p, open: false })), 3000);
  };

  // ── Apply settings (from Dashboard5) ──────────────────────────────────────
  useEffect(() => {
    if (!settings) return;
    if (settings.title_color) setTitleColor(settings.title_color);
    if (settings.subtitle_color) setSubtitleColor(settings.subtitle_color);
    if (settings.border_color) setBorderColor(settings.border_color);
    if (settings.main_button_color) setMainButtonColor(settings.main_button_color);
    if (settings.sub_button_color) setSubButtonColor(settings.sub_button_color);
    if (settings.company_name) setCompanyName(settings.company_name);
    if (settings.short_term) setShortTerm(settings.short_term);
  }, [settings]);

  // ── Fetch active school year (from Dashboard5) ─────────────────────────────
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/active_school_year`)
      .then((res) => {
        const active = res.data?.[0];
        if (active) {
          setActiveYearId(active.year_id);
          setActiveSemesterId(active.semester_id);
        }
      })
      .catch((err) => console.error("Failed to fetch active school year", err));
  }, []);

  // ── Auth + load (from Dashboard5 — do not alter) ───────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");

    const overrideId = props?.adminOverridePersonId;

    if (overrideId) {
      setUserRole("superadmin");
      setUserID(overrideId);
      fetchPersonData(overrideId);
      return;
    }

    if (storedUser && storedRole && storedID) {
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

  // ── Fetch person (from Dashboard5 — do not alter) ─────────────────────────
  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);
      setPerson(res.data);
    } catch (error) { }
  };

  // ── handleUpdate (from Dashboard5 — do not alter) ─────────────────────────
  const handleUpdate = async () => {
    const updatedPerson = {
      ...person,
      created_at: person.created_at,
    };
    try {
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, updatedPerson);
      console.log("Auto-saved with created_at:", updatedPerson.created_at);
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  // ── handleBlur (from Dashboard5 — do not alter) ───────────────────────────
  const handleBlur = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, person);
      console.log("Auto-saved");
    } catch (err) {
      console.error("Auto-save failed", err);
    }
  };

  // ── handleChange (from Dashboard5) ────────────────────────────────────────
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    const updatedPerson = {
      ...person,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    };
    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  // ── isFormValid (from Dashboard5) ─────────────────────────────────────────
  const isFormValid = () => {
    let newErrors = {};
    let isValid = true;
    if (person.termsOfAgreement !== 1) {
      newErrors.termsOfAgreement = true;
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  // ── submitFinalApplication (from Dashboard5 — do not alter) ───────────────
  const submitFinalApplication = async () => {
    if (!isFormValid()) {
      showSnackbar("Please accept the Terms of Agreement.", "error");
      return;
    }

    if (!person.program) {
      showSnackbar("No program selected.", "error");
      return;
    }

    if (!activeYearId || !activeSemesterId) {
      showSnackbar("Active school year not found.", "error");
      console.log(activeSemesterId);
      return;
    }

    try {
      console.log(activeSemesterId);
      localStorage.setItem("currentStep", "6");
      showSnackbar(
        "Application submitted successfully. Please upload your documents.",
        "success"
      );
      setTimeout(() => navigate("/applicant_online_requirements"), 1500);
    } catch (error) {
      if (error.response?.status === 409) {
        showSnackbar(error.response.data.message, "error");
      } else {
        showSnackbar("Submission failed. Please try again.", "error");
      }
    }
  };

  // ── Exam permit (from Dashboard5) ─────────────────────────────────────────
  useEffect(() => {
    if (!userID) return;
    axios
      .get(`${API_BASE_URL}/api/verified-exam-applicants`)
      .then((res) => {
        const verified = res.data.some(
          (a) => a.person_id === parseInt(userID)
        );
        setCanPrintPermit(verified);
      });
  }, [userID]);

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

  const handleCloseExamPermitModal = () => {
    setExamPermitModalOpen(false);
    setExamPermitError("");
  };

  const handleExamPermitClick = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/verified-exam-applicants`
      );
      const verified = res.data.some(
        (a) => a.person_id === parseInt(userID)
      );
      if (!verified) {
        setExamPermitError(
          "❌ You cannot print the Exam Permit until all required documents are verified."
        );
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
      setExamPermitError(
        "⚠️ Unable to check document verification status right now."
      );
      setExamPermitModalOpen(true);
    }
  };

  // ── Keys & steps navigation (from Dashboard5) ─────────────────────────────
  const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");

  const stepsWithPaths = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/applicant_personal_information/${keys.step1}` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/applicant_family_background/${keys.step2}` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/applicant_educational_attainment/${keys.step3}` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/applicant_health_medical_records/${keys.step4}` },
    { label: "Other Information", icon: <InfoIcon />, path: `/applicant_other_information/${keys.step5}` },
  ];

  const [activeStep, setActiveStep] = useState(4);
  const [clickedSteps, setClickedSteps] = useState(Array(stepsWithPaths.length).fill(false));


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

  // ── Links (from Dashboard5) ────────────────────────────────────────────────
  const links = [
    { to: "/ecat_application_form", label: "ECAT Application Form" },
    { to: "/admission_form_process", label: "Admission Form Process" },
    { to: "/personal_data_form", label: "Personal Data Form" },
    {
      to: "/office_of_the_registrar",
      label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} College Admission`,
    },
    {
      to: "/admission_services",
      label: "Application/Student Satisfactory Survey",
    },
    { label: "Examination Permit", onClick: handleExamPermitClick },
  ];

  // ── Derived name helpers (from StudentDashboard5Mobile) ───────────────────
  const institutionName = shortTerm
    ? `${companyName || ""} (${shortTerm.toUpperCase()})`
    : companyName || "the institution";

  const shortName = shortTerm
    ? shortTerm.toUpperCase()
    : companyName || "the University";

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
      {/* Hidden print target */}
      {showPrintView && (
        <div ref={divToPrintRef} style={{ display: "block" }}>
          <ExamPermit />
        </div>
      )}

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
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          mb: 1,
          padding: 1,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: { xs: "22px", sm: "28px", md: "36px" },
          }}
        >
          OTHER INFORMATION
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      {/* ── Notice Banner ──────────────────────────────────────────────── */}
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

      {/* ── Printable Documents ────────────────────────────────────────── */}
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

      {/* ── Applicant Form Intro ───────────────────────────────────────── */}
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

      {/* ── Stepper ────────────────────────────────────────────────────── */}
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

      {/* ── Step Header Bar ────────────────────────────────────────────── */}
      <Box
        sx={{
          backgroundColor: settings?.header_color || "#1976d2",
          border: `1px solid ${borderColor}`,
          color: "white",
          borderRadius: 2,
          mx: "12px",
          mt: "12px",
          p: "10px 14px",
        }}
      >
        <Typography sx={{ fontSize: 14, fontFamily: "Poppins, sans-serif" }}>
          Step 5: Other Information
        </Typography>
      </Box>

      {/* ── Data Subject Consent Form ──────────────────────────────────── */}
      <div style={{ ...S.card, border: `1px solid ${borderColor}`, }}>
        <div
          style={{
            ...S.cardHeader,
            backgroundColor: settings?.header_color || "#1976d2",
          }}
        >
          Data Subject Consent Form
        </div>
        <div style={S.cardBody}>
          <div
            style={{ fontSize: 12, color: "#555", marginBottom: 12, lineHeight: 1.6 }}
          >
            In accordance with RA 10173 or Data Privacy Act of 2012, I give my
            consent to the following terms and conditions on the collection,
            use, processing, and disclosure of my personal data:
          </div>

          <div style={S.consentBox}>
            <p style={S.consentText}>
              <strong>1.</strong> I am aware that the {institutionName} has
              collected and stored my personal data during my
              admission/enrollment at {shortName}. This data includes my
              demographic profile, contact details like home address, email
              address, landline numbers, and mobile numbers.
            </p>

            <p style={S.consentText}>
              <strong>2.</strong> I agree to personally update these data
              through personal request from the Office of the Registrar.
            </p>

            <p style={S.consentText}>
              <strong>3.</strong> In consonance with the above stated Act, I am
              aware that the University will protect my school records related
              to my being a student/graduate of {shortName}. However, I have
              the right to authorize a representative to claim the same subject
              to the policy of the University.
            </p>

            <p style={S.consentText}>
              <strong>4.</strong> In order to promote efficient management of
              the organization's records, I authorize the University to manage
              my data for data sharing with industry partners, government
              agencies/embassies, other educational institutions, and other
              offices for the university for employment, statistics,
              immigration, transfer credentials, and other legal purposes that
              may serve me best.
            </p>

            <p style={{ ...S.consentText, marginBottom: 0 }}>
              By clicking the submit button, I warrant that I have read,
              understood all of the above provisions, and agreed to its full
              implementation.
            </p>
          </div>

          <hr style={S.divider} />

          <p style={{ ...S.consentText, fontStyle: "italic", color: "#555" }}>
            I certify that the information given above are true, complete, and
            accurate to the best of my knowledge and belief. I promise to abide
            by the rules and regulations of {institutionName} regarding the ECAT
            and my possible admission. I am aware that any false or misleading
            information and/or statement may result in the refusal or
            disqualification of my admission to the institution.
          </p>

          {/* Agreement Checkbox — uses Dashboard5's handleChange + handleBlur */}
          <div
            style={{
              ...S.agreeRow,
              border: errors.termsOfAgreement
                ? "1px solid #d32f2f"
                : "1px solid #6D2323",
              backgroundColor: errors.termsOfAgreement ? "#fff5f5" : "#fff3f3",
            }}
          >
            <input
              type="checkbox"
              name="termsOfAgreement"
              checked={person.termsOfAgreement === 1}
              onChange={handleChange}
              onBlur={handleBlur}
              style={{
                width: 22,
                height: 22,
                accentColor: "#6D2323",
                flexShrink: 0,
                cursor: "pointer",
              }}
            />
            <span style={S.agreeLabel}>I agree to the Terms of Agreement</span>
          </div>

          {errors.termsOfAgreement && (
            <div style={S.errorText}>
              You must agree to the Terms of Agreement to proceed.
            </div>
          )}
        </div>
      </div>

      {/* ── Final Step Card ────────────────────────────────────────────── */}
      <div style={{ ...S.card, marginBottom: 16, border: `1px solid ${borderColor}`, }}>
        <div
          style={{
            ...S.cardHeader,
            backgroundColor: settings?.header_color || "#1976d2",
          }}
        >
          Final Step
        </div>
        <div style={S.cardBody}>
          <div style={{ fontSize: 13, color: "#333", lineHeight: 1.6 }}>
            You are on the last step of the application form. Once you submit,
            your information will be saved and you will be directed to the
            online requirements page. Make sure all previous steps are
            completed before submitting.
          </div>
        </div>

        {/* ── Bottom Navigation ────────────────────────────────────────── */}
        <Box
          display="flex"
          justifyContent="space-between"
          mt={2}
          mx="12px"
          mb={2}
        >
          <Button
            variant="contained"
            onClick={() => {
              handleUpdate(person);  // ADD THIS
              showSnackbar("Your record has been saved successfully!", "success");
              setTimeout(() => navigate(`/applicant_health_medical_records/${keys.step4}`), 1000);
            }}
            startIcon={
              <ArrowBackIcon
                sx={{ color: "#000", transition: "color 0.3s" }}
              />
            }
            sx={{
              backgroundColor: subButtonColor,
              border: `1px solid ${borderColor}`,
              color: "#000",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": {
                backgroundColor: "#000",
                color: "#fff",
                "& .MuiSvgIcon-root": { color: "#fff" },
              },
            }}
          >
            Previous Step
          </Button>

          <Button
            variant="contained"
            onClick={submitFinalApplication}
            endIcon={<FolderIcon sx={{ color: "#fff", transition: "color 0.3s" }} />}
            sx={{
              backgroundColor: mainButtonColor,
              border: `1px solid ${borderColor}`,
              color: "#fff",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": {
                backgroundColor: "#000",
                color: "#fff",
                "& .MuiSvgIcon-root": { color: "#fff" },
              },
            }}
          >
            Submit (Save Information)
          </Button>
        </Box>
      </div>

      {/* ── Exam Permit Error Modal (from Dashboard5) ──────────────────── */}
      <Modal
        open={examPermitModalOpen}
        onClose={handleCloseExamPermitModal}
        aria-labelledby="exam-permit-error-title"
        aria-describedby="exam-permit-error-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "85%",
            maxWidth: 360,
            bgcolor: "background.paper",
            border: `1px solid ${borderColor}`,
            boxShadow: 24,
            p: 3,
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          <ErrorIcon sx={{ color: mainButtonColor, fontSize: 44, mb: 1.5 }} />
          <Typography
            id="exam-permit-error-title"
            variant="h6"
            component="h2"
            color="maroon"
            sx={{ fontSize: 16 }}
          >
            Exam Permit Notice
          </Typography>
          <Typography
            id="exam-permit-error-description"
            sx={{ mt: 1.5, fontSize: 13 }}
          >
            {examPermitError}
          </Typography>
          <Button
            onClick={handleCloseExamPermitModal}
            variant="contained"
            sx={{
              mt: 2.5,
              backgroundColor: mainButtonColor,
              "&:hover": { backgroundColor: "#8B0000" },
              fontSize: 13,
            }}
          >
            Close
          </Button>
        </Box>
      </Modal>
    </div>
  );
};

export default ApplicantOtherInformationMobile;
