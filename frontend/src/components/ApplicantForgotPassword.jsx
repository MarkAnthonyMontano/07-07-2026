import React, { useState, useEffect, useContext } from "react";
import { io } from "socket.io-client";
import {
  Snackbar,
  Alert,
  Box,
  Container,
  TextField,
  InputAdornment,
  Button,
} from "@mui/material";
import { Link } from "react-router-dom";
import { Email, Badge, Cake } from "@mui/icons-material";
import { SettingsContext } from "../App";
import Logo from "../assets/Logo.png";
import "../styles/Container.css";
import API_BASE_URL from "../apiConfig";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ─── Mobile breakpoint hook ─── */
const useIsMobile = (bp = 768) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= bp : false,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= bp);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [bp]);
  return isMobile;
};

const ApplicantForgotPassword = () => {
  const socket = useRef(null);
  const settings = useContext(SettingsContext);
  const isMobile = useIsMobile();

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

  useEffect(() => {
    if (settings) {
      if (settings.title_color) setTitleColor(settings.title_color);
      if (settings.subtitle_color) setSubtitleColor(settings.subtitle_color);
      if (settings.border_color) setBorderColor(settings.border_color);
      if (settings.main_button_color)
        setMainButtonColor(settings.main_button_color);
    }
  }, [settings]);

  const [email, setEmail] = useState("");
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [currentYear, setCurrentYear] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [applicantNumber, setApplicantNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    setCurrentYear(new Date(now).getFullYear());
  }, []);

  useEffect(() => {
    socket.current = io(API_BASE_URL, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket.current) return;
    const handler = (data) => {
      setSnack({
        open: true,
        message: data.message,
        severity: data.success ? "success" : "error",
      });
      if (data.success) {
        localStorage.setItem("force_password_change", "true");
        localStorage.setItem("reset_email", data.email || email); // carry email forward
        setResetSent(true);
        setCooldown(60);

        // ✅ Force navigate to reset password page after short delay
        setTimeout(() => navigate("/applicant_reset_password"), 1500);
      }
    };
    socket.current.on("password-reset-result-applicant", handler);
    return () => socket.current.off("password-reset-result-applicant", handler);
  }, []);

  const navigate = useNavigate();

  const handleReset = () => {
    if (resetSent || cooldown > 0) return;

    if (!email) {
      setSnack({
        open: true,
        message: "Please enter your email.",
        severity: "warning",
      });
      return;
    }
    socket.current.emit("forgot-password-applicant", {
      email,
      applicant_number: applicantNumber,
      birthdate,
    });
  };

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  const backgroundImage = settings?.bg_image
    ? `url(${API_BASE_URL}${settings.bg_image})`
    : "linear-gradient(to right, #f5f5f5, #fafafa)";
  const logoSrc = settings?.logo_url
    ? `${API_BASE_URL}${settings.logo_url}`
    : Logo;

  const isButtonDisabled =
    !email || !applicantNumber || !birthdate || resetSent || cooldown > 0;

  /* shared TextField sx for mobile-friendly height */
  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      height: isMobile ? "48px" : "50px",
      "& input": {
        height: isMobile ? "48px" : "50px",
        padding: "0 10px",
        boxSizing: "border-box",
      },
    },
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
    <Box
      sx={{
        backgroundImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "center",
        marginTop: isMobile ? 0 : "-50px",
        overflowY: isMobile ? "auto" : "hidden",
        py: isMobile ? 2 : 0,
      }}
    >
      <Container
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "0" : undefined,
        }}
        maxWidth={false}
      >
        <div
          style={{
            border: isMobile ? "3px solid black" : "5px solid black",
            width: isMobile ? "calc(100% - 32px)" : undefined,
            maxWidth: isMobile ? 480 : undefined,
          }}
          className="Container"
        >
          {/* ── Header ── */}
          <div
            className="Header"
            style={{
              backgroundColor: settings?.header_color || "#1976d2",
              padding: isMobile ? "12px 10px" : "1rem 0",
              borderBottom: "3px solid black",
            }}
          >
            <div className="HeaderTitle">
              <div className="CircleCon">
                <img src={logoSrc} alt="Logo" />
              </div>
            </div>
            <div className="HeaderBody">
              <strong style={{ color: "white" }}>
                {(settings?.company_name || "Company Name")
                  .split(" ")
                  .reduce((acc, word, i) => {
                    if (i % 4 === 0 && i !== 0)
                      acc.push(<br key={`br-${i}`} />);
                    acc.push(word + " ");
                    return acc;
                  }, [])}
              </strong>
              <p>Academic Information System</p>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="Body">
            {/* Applicant Number */}
            <label
              style={{
                fontWeight: 500,
                color: "rgba(0,0,0,0.6)",
                marginBottom: "5px",
                display: "block",
              }}
            >
              Applicant Number:
            </label>
            <TextField
              fullWidth
              value={applicantNumber}
              onChange={(e) => setApplicantNumber(e.target.value)}
              placeholder="Enter Applicant Number"
              sx={{
                borderRadius: "5px",
                border: `2px solid ${borderColor}`,
                marginBottom: isMobile ? "14px" : "15px",
                ...fieldSx,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Badge />
                  </InputAdornment>
                ),
              }}
            />

            {/* Email */}
            <label
              htmlFor="email"
              style={{
                fontWeight: 500,
                color: "rgba(0,0,0,0.6)",
                marginBottom: "5px",
                display: "block",
              }}
            >
              Email Address:
            </label>
            <TextField
              fullWidth
              type="email"
              placeholder="Enter your Email Address (e.g., username@gmail.com)"
              variant="outlined"
              sx={{
                borderRadius: "5px",
                border: `2px solid ${borderColor}`,
                marginBottom: isMobile ? "14px" : "15px",
                ...fieldSx,
              }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
            />

            {/* Birthday */}
            <label
              style={{
                fontWeight: 500,
                color: "rgba(0,0,0,0.6)",
                marginBottom: "5px",
                display: "block",
              }}
            >
              Birthday:
            </label>
            <TextField
              fullWidth
              type="date"
              value={birthdate}
              sx={{
                borderRadius: "5px",
                border: `2px solid ${borderColor}`,
                ...fieldSx,
              }}
              onChange={(e) => setBirthdate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Cake />
                  </InputAdornment>
                ),
              }}
            />

            {/* Submit Button */}
            <Box
              sx={{
                mt: isMobile ? 3 : 4,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Button
                onClick={handleReset}
                variant="contained"
                disabled={isButtonDisabled}
                sx={{
                  width: "100%",
                  py: 1.5,
                  backgroundColor: mainButtonColor,
                  border: `2px solid ${borderColor}`,
                  color: "white",
                  height: "50px",
                  borderRadius: "10px",
                  fontSize: isMobile ? "14px" : "15px",
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {cooldown > 0
                  ? `Retry in ${cooldown}s`
                  : resetSent
                    ? "Email Sent"
                    : "Reset Password"}
              </Button>
            </Box>

            {/* Back to login */}
            <div className="LinkContainer" style={{ marginTop: "1rem" }}>
              <p>To go to login page,</p>
              <span>
                <Link
                  to="/login_applicant"
                  style={{ textDecoration: "underline" }}
                >
                  Click here
                </Link>
              </span>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="Footer">
            <div className="FooterText">
              &copy; {currentYear} {settings?.company_name || "EARIST"} <br />
              Academic Information System. <br />
              All rights reserved.
            </div>
          </div>
        </div>
      </Container>

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={handleClose}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApplicantForgotPassword;
