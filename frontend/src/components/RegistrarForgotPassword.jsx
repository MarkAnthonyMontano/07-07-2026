import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
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
import "../styles/Container.css";
import Logo from "../assets/Logo.png";
import { Email, Badge as BadgeIcon } from "@mui/icons-material";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import { useNavigate } from "react-router-dom";

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

const RegistrarForgotPassword = () => {
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
  const [identifier, setIdentifier] = useState("");
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
    });

    const year = new Date(now).getFullYear();
    setCurrentYear(year);
  }, []);

  const navigate = useNavigate();


  const handleReset = async () => {
    if (loading || cooldown > 0) return;

    if (!email) {
      setSnack({
        open: true,
        message: "Please enter your email.",
        severity: "warning",
      });

      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/forgot-password`, {
        email,
        identifier,
      });

      localStorage.setItem("force_password_change", "true");
      localStorage.setItem("reset_email", email);

      setSnack({
        open: true,
        message: res.data.message,
        severity: "success",
      });

      setCooldown(60);
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || "Something went wrong.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;

    setSnack((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const isButtonDisabled =
    !email || !identifier || loading || cooldown > 0;

  const backgroundImage = settings?.bg_image
    ? `url(${API_BASE_URL}${settings.bg_image})`
    : "linear-gradient(to right, #f5f5f5, #fafafa)";

  const logoSrc = settings?.logo_url
    ? `${API_BASE_URL}${settings.logo_url}`
    : Logo;

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
          className="Container"
          style={{
            border: isMobile ? "3px solid black" : "5px solid black",
            width: isMobile ? "calc(100% - 32px)" : undefined,
            maxWidth: isMobile ? 480 : undefined,
          }}
        >
          {/* Header */}
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
                <img src={logoSrc} alt="EARIST Logo" />
              </div>
            </div>

            <div className="HeaderBody">
              <strong style={{ color: "white" }}>
                {(settings?.company_name || "Company Name")
                  .split(" ")
                  .reduce((acc, word, index) => {
                    if (index % 4 === 0 && index !== 0) {
                      acc.push(<br key={`br-${index}`} />);
                    }

                    acc.push(word + " ");

                    return acc;
                  }, [])}
              </strong>

              <p>Academic Information System</p>
            </div>
          </div>

          {/* Body */}
          <div className="Body">
            {/* Identifier */}
            <label
              style={{
                fontWeight: 500,
                color: "rgba(0,0,0,0.6)",
                marginBottom: "5px",
                display: "block",
              }}
            >
              Student Number / Employee ID:
            </label>

            <TextField
              fullWidth
              placeholder="Enter Student No. / Employee ID"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              sx={{
                borderRadius: "5px",
                border: `2px solid ${borderColor}`,
                marginBottom: isMobile ? "14px" : "15px",
                ...fieldSx,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BadgeIcon />
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{
                borderRadius: "5px",
                border: `2px solid ${borderColor}`,
                marginBottom: isMobile ? "14px" : "15px",
                ...fieldSx,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
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
                  : loading
                    ? "Sending..."
                    : "Reset Password"}
              </Button>
            </Box>

            {/* Back to login */}
            <div
              className="LinkContainer"
              style={{ marginTop: "1rem" }}
            >
              <p>To go to login page,</p>

              <span>
                <Link
                  to="/"
                  style={{ textDecoration: "underline" }}
                >
                  Click here
                </Link>
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="Footer">
            <div className="FooterText">
              &copy; {currentYear}{" "}
              {settings?.company_name || "EARIST"} <br />
              Academic Information System. <br />
              All rights reserved.
            </div>
          </div>
        </div>
      </Container>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
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

export default RegistrarForgotPassword;