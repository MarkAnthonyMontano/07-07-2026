import React, { useState, useRef, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Modal } from "@mui/material";
import {
  Container,
  Box,
  Snackbar,
  Alert,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  ArrowDropDown as ArrowDropDownIcon,
  PhoneAndroid as PhoneAndroidIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import "../styles/Container.css";
import Logo from "../assets/Logo.png";
import { SettingsContext } from "../App";
import LoadingOverlay from "./LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import MuiLink from "@mui/material/Link";

/* ─── Mobile breakpoint hook ─── */
const useIsMobile = (bp = 768) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= bp : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= bp);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [bp]);
  return isMobile;
};

function accessToSet(list = []) {
  return new Set(list.map(Number));
}
function getRegistrarDashboard(accessSet) {
  if (accessSet.has(101)) return "/registrar_dashboard";
  if (accessSet.has(102)) return "/enrollment_officer_dashboard";
  if (accessSet.has(103)) return "/admission_officer_dashboard";

}
function getUserDashboard(role, accessList = []) {
  const accessSet = accessToSet(accessList);
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "registrar") return getRegistrarDashboard(accessSet);
  if (normalizedRole === "faculty") return "/faculty_dashboard";
  if (normalizedRole === "superadmin") return "/system_dashboard";
  return "/student_dashboard";
}

/* ─── Per-email localStorage lockout helpers ─── */
function lockoutKey(email) {
  return `enrollment_lockout_until::${String(email).trim().toLowerCase()}`;
}
function getLockoutRemaining(email) {
  if (!email) return 0;
  const until = localStorage.getItem(lockoutKey(email));
  if (!until) return 0;
  const remaining = Math.ceil((Number(until) - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}
function saveLockout(email, seconds) {
  if (!email) return;
  localStorage.setItem(lockoutKey(email), String(Date.now() + seconds * 1000));
}
function clearLockout(email) {
  if (!email) return;
  localStorage.removeItem(lockoutKey(email));
}

/* ══════════════════════════════════════════════════════════════════════════
   TOTP LOGIN MODAL
══════════════════════════════════════════════════════════════════════════ */
const TotpLoginModal = ({
  open,
  onClose,
  onSuccess,
  loginData,
  mainButtonColor,
  isMobile,
}) => {
  const [step, setStep] = useState("verify");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [showManualKey, setShowManualKey] = useState(false);
  const [scale, setScale] = useState(1);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);

  const isSetupFlow = loginData?.requireTotpSetup === true;

  useEffect(() => {
    if (!open || !loginData) return;
    setCode(["", "", "", "", "", ""]);
    setError("");
    setShowManualKey(false);
    setScale(1);

    if (isSetupFlow) {
      setStep("loading_qr");
      axios
        .post(`${API_BASE_URL}/api/login-totp-setup`, {
          email: loginData.email,
          source: loginData.source || "user",
        })
        .then((res) => {
          if (res.data.success) {
            setQrDataUrl(res.data.qrDataUrl);
            setManualKey(res.data.manualKey);
            setStep("scan");
          } else {
            setError(res.data.message || "Failed to generate QR code.");
            setStep("scan");
          }
        })
        .catch((err) => {
          setError(err.response?.data?.message || "Failed to generate setup.");
          setStep("scan");
        });
    } else {
      setStep("verify");
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
  }, [open, loginData?.email]);

  const handleDigitChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (code[index]) {
        const next = [...code];
        next[index] = "";
        setCode(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "Enter") handleVerify();
  };

  const handleVerify = async () => {
    const totpToken = code.join("");
    if (!/^\d{6}$/.test(totpToken)) {
      setError("Please enter the complete 6-digit code from Google Authenticator.");
      return;
    }
    setError("");
    setStep("submitting");

    try {
      const verifyRes = await axios.post(`${API_BASE_URL}/api/verify-login-totp`, {
        email: loginData.email,
        token: totpToken,
        isSetup: isSetupFlow,
        source: loginData.source || "user",
        audit_log_db: "db3",
      });

      if (!verifyRes.data.success) {
        setError(verifyRes.data.message || "Verification failed.");
        setStep("verify");
        return;
      }

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
      setStep("verify");
    }
  };

  if (!open) return null;

  const canClose = step !== "submitting";

  return (
    <Modal open={open} onClose={canClose ? onClose : undefined}>
      <Box sx={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: isMobile ? "calc(100% - 32px)" : 480,
        maxWidth: 480,
        bgcolor: "#fff", borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        p: isMobile ? 3 : 4,
        border: "1px solid #eee",
        outline: "none",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        {/* Close */}
        {canClose && (
          <button onClick={onClose} style={{
            position: "absolute", top: "12px", right: "12px",
            backgroundColor: "black", color: "white", border: "none",
            borderRadius: "50%", width: "34px", height: "34px",
            cursor: "pointer", fontSize: "16px", fontWeight: "bold",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        )}

        {/* ── Loading QR ── */}
        {step === "loading_qr" && (
          <Box sx={{ textAlign: "center", py: 5 }}>
            <CircularProgress sx={{ color: mainButtonColor }} />
            <Typography sx={{ mt: 2, color: "#666", fontSize: "14px" }}>
              Generating your authenticator QR code…
            </Typography>
          </Box>
        )}

        {/* ── Scan QR (setup flow only) ── */}
        {step === "scan" && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <Box sx={{
                width: 42, height: 42, borderRadius: "50%",
                bgcolor: mainButtonColor,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <PhoneAndroidIcon sx={{ color: "#fff", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography fontWeight={700} fontSize={isMobile ? 15 : 17}>
                  Set Up Google Authenticator
                </Typography>
                <Typography fontSize={12} color="#888">
                  One-time setup — Step 1 of 2
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                bgcolor: "#f8f9ff",
                borderRadius: "12px",
                p: 2,
                mb: 2.5,
                border: "1px solid #e8eaff",
              }}
            >
              {/* ── FIXED: each step on its own clear line ── */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>

                {/* Step 1 label */}
                <Typography fontSize={13} color="#444" fontWeight={600}>
                  1. Download and install <strong>Google Authenticator</strong>:
                </Typography>

                {/* Download buttons — each on its own row */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, pl: 1 }}>
                  <Box sx={{
                    display: "flex", alignItems: "center", gap: 1,
                    bgcolor: "#fff", border: "1px solid #dde3ff",
                    borderRadius: "8px", px: 1.5, py: 1,
                  }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>📱</span>
                    <MuiLink
                      href="https://apps.apple.com/app/google-authenticator/id388497605"
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="always"
                      fontWeight="bold"
                      fontSize={13}
                      color="inherit"
                    >
                      App Store <span style={{ fontWeight: 400, color: "#888" }}>(iPhone / iPad)</span>
                    </MuiLink>
                  </Box>

                  <Box sx={{
                    display: "flex", alignItems: "center", gap: 1,
                    bgcolor: "#fff", border: "1px solid #dde3ff",
                    borderRadius: "8px", px: 1.5, py: 1,
                  }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>🤖</span>
                    <MuiLink
                      href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="always"
                      fontWeight="bold"
                      fontSize={13}
                      color="inherit"
                    >
                      Google Play <span style={{ fontWeight: 400, color: "#888" }}>(Android)</span>
                    </MuiLink>
                  </Box>
                </Box>

                {/* Step 2 */}
                <Typography fontSize={13} color="#444" lineHeight={1.6}>
                  <strong>2.</strong> Open the app → tap <strong>"+"</strong> → <strong>"Scan a QR code"</strong>.
                </Typography>

                {/* Step 3 */}
                <Typography fontSize={13} color="#444" lineHeight={1.6}>
                  <strong>3.</strong> Scan the QR code below.
                </Typography>

              </Box>
            </Box>

            {error ? (
              <Box sx={{ border: "1px solid #f44336", borderRadius: "12px", p: 2, mb: 2.5, textAlign: "center" }}>
                <Typography color="error" fontSize={13}>{error}</Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", mb: 2 }}>
                {qrDataUrl ? (
                  <>
                    <img
                      src={qrDataUrl}
                      alt="Google Authenticator QR Code"
                      style={{
                        width: isMobile ? 170 : 200,
                        height: isMobile ? 170 : 200,
                        border: "3px solid #000",
                        borderRadius: "12px",
                        transform: `scale(${scale})`,
                        transformOrigin: "center",
                        transition: "transform 0.2s",
                        display: "inline-block",
                      }}
                    />
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 1.5 }}>
                      <button onClick={() => setScale((s) => Math.min(s + 0.25, 2))}
                        style={{ background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "8px", padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "12px" }}>
                        <ZoomInIcon sx={{ fontSize: 16 }} /> Zoom in
                      </button>
                      <button onClick={() => setScale((s) => Math.max(s - 0.25, 1))}
                        style={{ background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "8px", padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "12px" }}>
                        <ZoomOutIcon sx={{ fontSize: 16 }} /> Zoom out
                      </button>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ width: 200, height: 200, bgcolor: "#f5f5f5", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto" }}>
                    <CircularProgress size={32} sx={{ color: mainButtonColor }} />
                  </Box>
                )}
              </Box>
            )}

            {/* Manual key fallback */}
            {manualKey && (
              <Box sx={{ mb: 2 }}>
                <button onClick={() => setShowManualKey((v) => !v)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: mainButtonColor, fontSize: "13px", fontWeight: 600, padding: 0, textDecoration: "underline" }}>
                  {showManualKey ? "Hide manual entry key" : "Can't scan? Enter key manually"}
                </button>
                {showManualKey && (
                  <>
                    <Box sx={{ mt: 1, p: "10px 14px", bgcolor: "#f5f5f5", borderRadius: "8px", border: "1px solid #ddd", fontFamily: "monospace", fontSize: isMobile ? "12px" : "13px", letterSpacing: "0.08em", color: "#222", wordBreak: "break-all", userSelect: "all" }}>
                      {manualKey}
                    </Box>
                    <Typography fontSize={11.5} color="#888" sx={{ mt: 0.5 }}>
                      In Google Authenticator: tap + → "Enter a setup key" → paste this key → select "Time based".
                    </Typography>
                  </>
                )}
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", bgcolor: "#fffbf2", border: "1px solid #f5a623", borderRadius: "8px", p: 1.5, mb: 2.5 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⏱️</span>
              <Typography fontSize={12} color="#5d4037" lineHeight={1.5}>
                This QR code expires in <strong>10 minutes</strong>. If it expires, close this and log in again.
              </Typography>
            </Box>

            <Button fullWidth variant="contained"
              onClick={() => {
                setStep("verify");
                setError("");
                setCode(["", "", "", "", "", ""]);
                setTimeout(() => inputRefs.current[0]?.focus(), 150);
              }}
              disabled={!!error || !qrDataUrl}
              sx={{ backgroundColor: mainButtonColor, color: "#fff", fontWeight: 700, fontSize: "15px", borderRadius: "12px", py: 1.5, textTransform: "none", "&:hover": { backgroundColor: mainButtonColor, opacity: 0.92 } }}
            >
              I've scanned it — Enter the code →
            </Button>
          </>
        )}

        {/* ── Enter code (both setup and normal login) ── */}
        {(step === "verify" || step === "submitting") && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <Box sx={{
                width: 42, height: 42, borderRadius: "50%",
                bgcolor: mainButtonColor,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <CheckCircleIcon sx={{ color: "#fff", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography fontWeight={700} fontSize={isMobile ? 15 : 17}>
                  {isSetupFlow ? "Confirm Your Authenticator Code" : "Google Authenticator"}
                </Typography>
                <Typography fontSize={12} color="#888">
                  {isSetupFlow ? "Step 2 of 2 — Verify setup" : "Enter the code from your app"}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ bgcolor: "#f8f9ff", borderRadius: "12px", p: 2, mb: 2.5, border: "1px solid #e8eaff" }}>
              <Typography fontSize={13} color="#444" lineHeight={1.7}>
                Open <strong>Google Authenticator</strong> on your phone and enter the <strong>6-digit code</strong> shown for this account.
              </Typography>
              <Typography fontSize={12} color="#888" sx={{ mt: 0.5 }}>
                The code refreshes every 30 seconds — always use the current one.
              </Typography>
            </Box>

            {/* 6-digit boxes */}
            <Box sx={{ display: "flex", justifyContent: "center", gap: isMobile ? 1 : 1.5, mb: 2.5 }}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e.target.value, index)}
                  onKeyDown={(e) => handleDigitKeyDown(e, index)}
                  disabled={step === "submitting"}
                  style={{
                    width: isMobile ? "42px" : "54px",
                    height: isMobile ? "52px" : "62px",
                    fontSize: "24px",
                    fontWeight: 700,
                    textAlign: "center",
                    borderRadius: "12px",
                    border: error ? "2px solid #f44336" : "2px solid #ddd",
                    outline: "none",
                    background: step === "submitting" ? "#f5f5f5" : "#fff",
                    transition: "border 0.2s",
                  }}
                />
              ))}
            </Box>

            {error && (
              <Box sx={{ bgcolor: "#fff5f5", border: "1px solid #f44336", borderRadius: "8px", p: 1.5, mb: 2 }}>
                <Typography fontSize={13} color="#c62828">{error}</Typography>
              </Box>
            )}

            <Button fullWidth variant="contained"
              onClick={handleVerify}
              disabled={step === "submitting"}
              sx={{ backgroundColor: mainButtonColor, color: "#fff", fontWeight: 700, fontSize: "15px", borderRadius: "12px", py: 1.5, textTransform: "none", mb: isSetupFlow ? 1.5 : 0, "&:hover": { backgroundColor: mainButtonColor, opacity: 0.92 } }}
            >
              {step === "submitting" ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <CircularProgress size={18} sx={{ color: "#fff" }} />
                  Verifying…
                </Box>
              ) : isSetupFlow ? "Verify & Complete Setup" : "Verify & Log In"}
            </Button>

            {isSetupFlow && (
              <Button fullWidth variant="outlined"
                onClick={() => { setStep("scan"); setError(""); }}
                disabled={step === "submitting"}
                sx={{ fontWeight: 600, fontSize: "13px", borderRadius: "12px", py: 1.25, textTransform: "none", color: "#555", borderColor: "#ddd", "&:hover": { borderColor: "#bbb", bgcolor: "#fafafa" } }}
              >
                ← Back to QR code
              </Button>
            )}
          </>
        )}
      </Box>
    </Modal>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   LOGIN ENROLLMENT
══════════════════════════════════════════════════════════════════════════ */
const LoginEnrollment = ({ setIsAuthenticated }) => {
  const settings = useContext(SettingsContext);
  const isMobile = useIsMobile();

  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

  useEffect(() => {
    if (settings) {
      if (settings.main_button_color) setMainButtonColor(settings.main_button_color);
    }
  }, [settings]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

  const [showTotpModal, setShowTotpModal] = useState(false);
  const [tempLoginData, setTempLoginData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState("");
  const [loginType, setLoginType] = useState("user");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const lockTimerRef = useRef(0);
  const [lockout, setLockout] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    setCurrentYear(new Date(now).getFullYear());
  }, []);

  useEffect(() => {
    if (!email) return;
    const remaining = getLockoutRemaining(email);
    if (remaining > 0 && !lockout) {
      lockTimerRef.current = remaining;
      setLockoutTimer(remaining);
      setLockout(true);
    }
  }, [email]);

  useEffect(() => {
    if (!lockout) return;
    const interval = setInterval(() => {
      lockTimerRef.current -= 1;
      setLockoutTimer(lockTimerRef.current);
      if (lockTimerRef.current <= 0) {
        clearInterval(interval);
        clearLockout(email);
        setLockout(false);
        lockTimerRef.current = 0;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockout]); // eslint-disable-line react-hooks/exhaustive-deps

  const startLockout = (emailVal, seconds) => {
    saveLockout(emailVal, seconds);
    lockTimerRef.current = seconds;
    setLockoutTimer(seconds);
    setLockout(true);
  };

  const backgroundImage = settings?.bg_image
    ? `url(${API_BASE_URL}${settings.bg_image})`
    : "linear-gradient(to right, #f5f5f5, #fafafa)";
  const logoSrc = settings?.logo_url ? `${API_BASE_URL}${settings.logo_url}` : Logo;

  const isFormValid = () => {
    let newErrors = {};
    let isValid = true;
    if (!email) { newErrors.email = true; isValid = false; }
    if (!password) { newErrors.password = true; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  const completeLogin = (data, shouldForceChange) => {
    localStorage.removeItem("lastVisitedPath");
    localStorage.setItem("token", data.token);
    localStorage.setItem("email", data.email);
    localStorage.setItem("role", data.role);
    localStorage.setItem("person_id", data.person_id);
    localStorage.setItem("prof_id", data.prof_id || "");
    localStorage.setItem("department", data.department || "");
    localStorage.setItem("employee_id", data.employee_id);
    localStorage.setItem("curriculum_id", data.curriculum_id || "");
    setIsAuthenticated(true);

    if (shouldForceChange) {
      const roleVal = data.role?.toLowerCase();
      const changePwPath =
        roleVal === "faculty" ? "/faculty_reset_password"
          : roleVal === "registrar" ? "/registrar_reset_password"
            : "/student_reset_password";
      navigate(changePwPath);
    } else {
      navigate(getUserDashboard(data.role, data.accessList));
    }
  };

  const handleLogin = async () => {
    if (!isFormValid()) {
      setSnack({ open: true, message: "Please fill in all fields", severity: "warning" });
      return;
    }
    const stillLocked = getLockoutRemaining(email);
    if (stillLocked > 0) {
      if (!lockout) { lockTimerRef.current = stillLocked; setLockoutTimer(stillLocked); setLockout(true); }
      return;
    }

    try {
      setLoading(true);
      const apiUrl = loginType === "applicant"
        ? `${API_BASE_URL}/api/login_applicant`
        : `${API_BASE_URL}/api/login`;

      const res = await axios.post(apiUrl, { email, password, audit_log_db: "db3" });

      if (res.data.locked) {
        const secs = res.data.remainingSeconds ?? 180;
        setSnack({ open: true, message: res.data.message, severity: "error" });
        startLockout(email, secs);
        return;
      }

      if (!res.data.success) {
        setSnack({ open: true, message: res.data.message, severity: "error" });
        return;
      }

      clearLockout(email);

      if (res.data.force_password_change) {
        localStorage.setItem("force_password_change", "true");
      } else {
        localStorage.removeItem("force_password_change");
      }
      const pendingKey = `pending_force_password_change::${(res.data.email || email).toLowerCase()}`;
      if (localStorage.getItem(pendingKey) === "true") {
        localStorage.setItem("force_password_change", "true");
        localStorage.removeItem(pendingKey);
      }

      if (loginType === "applicant") {
        const shouldForceChange = localStorage.getItem("force_password_change") === "true";
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("email", res.data.email);
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("person_id", res.data.person_id);
        localStorage.setItem("applyingAs", res.data.applyingAs || "");
        localStorage.setItem("prof_id", "");
        localStorage.setItem("employee_id", "");
        localStorage.setItem("curriculum_id", "");
        setIsAuthenticated(true);
        navigate(shouldForceChange ? "/applicant_reset_password" : "/applicant_dashboard");
        return;
      }

      if (res.data.requireTotpSetup || res.data.requireTotp) {
        setTempLoginData(res.data);
        setShowTotpModal(true);
        setSnack({
          open: true,
          message: res.data.requireTotpSetup
            ? "Please set up Google Authenticator to continue."
            : "Enter the code from Google Authenticator.",
          severity: "info",
        });
        return;
      }

      const shouldForceChange = localStorage.getItem("force_password_change") === "true";
      completeLogin(res.data, shouldForceChange);

    } catch (error) {
      const data = error.response?.data;
      const message = data?.message || "Login failed";
      const attemptsLeft = data?.remaining;
      const displayMsg = attemptsLeft != null
        ? `${message} (${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} left)`
        : message;
      setSnack({ open: true, message: displayMsg, severity: "error" });
      if (data?.remainingSeconds || message.toLowerCase().includes("too many") || message.toLowerCase().includes("locked")) {
        startLockout(email, data?.remainingSeconds ?? 180);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSuccess = () => {
    setShowTotpModal(false);
    const shouldForceChange = localStorage.getItem("force_password_change") === "true";
    completeLogin(tempLoginData, shouldForceChange);
  };

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
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

  return (
    <>
      <Box sx={{
        backgroundImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "center",
        position: "relative",
        overflowY: isMobile ? "auto" : "hidden",
        py: isMobile ? 2 : 0,
      }}>
        <Container
          style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: isMobile ? 0 : "-100px", padding: isMobile ? "0" : undefined }}
          maxWidth={false}
        >
          <div
            style={{ border: isMobile ? "3px solid black" : "5px solid black", width: isMobile ? "calc(100% - 32px)" : undefined, maxWidth: isMobile ? 480 : undefined }}
            className="Container"
          >
            <div className="Header" style={{ backgroundColor: settings?.header_color || "#1976d2", padding: isMobile ? "12px 10px" : "1rem 0", borderBottom: "3px solid black" }}>
              <div className="HeaderTitle">
                <div className="CircleCon"><img src={logoSrc} alt="Logo" /></div>
              </div>
              <div className="HeaderBody">
                <strong style={{ color: "white" }}>
                  {(settings?.company_name || "Company Name").split(" ").reduce((acc, word, i) => {
                    if (i % 4 === 0 && i !== 0) acc.push(<br key={`br-${i}`} />);
                    acc.push(word + " ");
                    return acc;
                  }, [])}
                </strong>
                <p>Academic Information System</p>
              </div>
            </div>

            <div className="Body">
              <div className="TextField" style={{ position: "relative" }}>
                <label htmlFor="loginType">Login As</label>
                <select
                  id="loginType" name="loginType" value={loginType}
                  onChange={(e) => {
                    setLoginType(e.target.value);
                    if (e.target.value === "applicant") navigate("/login_applicant");
                    else navigate("/login");
                  }}
                  style={{ width: "100%", padding: "0.8rem 2.5rem 0.8rem 2.5rem", borderRadius: "6px", border: "2px solid black", height: "55px", fontSize: "1rem", backgroundColor: "white", outline: "none", appearance: "none", WebkitAppearance: "none", MozAppearance: "none", cursor: "pointer" }}
                >
                  <option value="user">Student / Faculty / Registrar</option>
                  <option value="applicant">Applicant</option>
                </select>
                <PersonIcon style={{ position: "absolute", top: "2.75rem", left: "0.7rem", color: "rgba(0,0,0,0.4)" }} />
                <ArrowDropDownIcon sx={{ position: "absolute", right: "10px", top: "70%", transform: "translateY(-50%)", fontSize: "30px", color: "black", pointerEvents: "none" }} />
              </div>

              <form onSubmit={(e) => { e.preventDefault(); if (!lockout) handleLogin(); }}>
                <div className="TextField" style={{ position: "relative" }}>
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="text" id="email" name="email"
                    placeholder="Enter your email address" className="border"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: "2.5rem", height: isMobile ? "48px" : "55px", border: errors.email ? "2px solid red" : "2px solid black" }}
                    autoFocus={!isMobile}
                  />
                  {errors.email && <span style={{ color: "red", fontSize: "12px" }}>Email is required</span>}
                  <EmailIcon style={{ position: "absolute", top: "2.75rem", left: "0.7rem", color: "rgba(0,0,0,0.4)" }} />
                </div>

                <div className="TextField" style={{ position: "relative" }}>
                  <label htmlFor="password">Password</label>
                  <input
                    type={showPassword ? "text" : "password"} id="password" name="password"
                    placeholder="Enter your password" value={password}
                    onChange={(e) => setPassword(e.target.value)} className="border"
                    style={{ paddingLeft: "2.5rem", height: isMobile ? "48px" : "55px", border: errors.password ? "2px solid red" : "2px solid black" }}
                  />
                  {errors.password && <span style={{ color: "red", fontSize: "12px" }}>Password is required</span>}
                  <LockIcon style={{ position: "absolute", top: "2.75rem", left: "0.7rem", color: "rgba(0,0,0,0.4)", fontSize: "26px" }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ color: "rgba(0,0,0,0.3)", outline: "none", position: "absolute", top: "2.5rem", right: "1rem", background: "none", border: "none", cursor: "pointer", marginBottom: "50px" }}>
                    {showPassword
                      ? <Visibility sx={{ fontSize: "26px", color: "rgba(0,0,0,0.4)" }} />
                      : <VisibilityOff sx={{ fontSize: "26px", color: "rgba(0,0,0,0.4)" }} />}
                  </button>
                </div>

                <div style={{ cursor: lockout || loading ? "not-allowed" : "pointer" }}>
                  <button
                    type="submit"
                    tabIndex={0}
                    disabled={lockout || loading}
                    style={{
                      width: "100%",
                      backgroundColor: lockout ? "#999" : loading ? "#ccc" : mainButtonColor,
                      border: "2px solid black",
                      color: "white",
                      height: "50px",
                      borderRadius: "10px",
                      padding: "0.5rem 0",
                      fontSize: "16px",
                      fontWeight: "bold",
                      marginTop: isMobile ? "28px" : "50px",
                      cursor: lockout || loading ? "not-allowed" : "pointer",
                      opacity: lockout || loading ? 0.8 : 1,
                      transition: "opacity 0.2s ease-in-out",
                    }}
                  >
                    {lockout ? `Locked (${lockoutTimer}s)` : loading ? "Processing..." : "Log In"}
                  </button>
                </div>
              </form>

              <div className="LinkContainer">
                <span><Link to="/forgot_password">Forgot your password</Link></span>
              </div>
            </div>

            <div className="Footer">
              <div className="FooterText">
                &copy; {currentYear} {settings?.company_name || "EARIST"} <br />
                Academic Information System. <br />
                All rights reserved.
              </div>
            </div>
          </div>
        </Container>

        <TotpLoginModal
          open={showTotpModal}
          onClose={() => setShowTotpModal(false)}
          onSuccess={handleTotpSuccess}
          loginData={tempLoginData}
          mainButtonColor={mainButtonColor}
          isMobile={isMobile}
        />

        <Snackbar open={snack.open} autoHideDuration={4000} onClose={handleClose} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
          <Alert severity={snack.severity} onClose={handleClose} sx={{ width: "100%" }}>{snack.message}</Alert>
        </Snackbar>

        <LoadingOverlay open={loading} />
      </Box>
    </>
  );
};

export default LoginEnrollment;
