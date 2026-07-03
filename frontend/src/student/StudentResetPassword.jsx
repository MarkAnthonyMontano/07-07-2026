// StudentResetPassword.jsx  — full replacement

import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box, Button, Typography, TextField, List, ListItem, ListItemIcon,
  ListItemText, IconButton, InputAdornment, Snackbar, InputLabel,
  Alert, Divider, Paper, Chip,
} from "@mui/material";
import {
  Visibility, VisibilityOff, CheckCircle, Cancel, Settings,
  PhoneAndroid as PhoneAndroidIcon, LockOpen as LockOpenIcon,
} from "@mui/icons-material";
import API_BASE_URL from "../apiConfig";
import { useNavigate } from "react-router-dom";

// ── Custom large toggle styles ──────────────────────────────────────────────
const makeToggleStyles = (onColor) => `
  .big-totp-toggle { position: relative; display: inline-block; width: 56px; height: 30px; flex-shrink: 0; }
  .big-totp-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .big-totp-slider {
    position: absolute; inset: 0; cursor: pointer;
    background: #ccc; border-radius: 15px;
    transition: background 0.25s;
  }
  .big-totp-slider::before {
    content: ''; position: absolute;
    height: 22px; width: 22px;
    left: 4px; bottom: 4px;
    background: #fff; border-radius: 50%;
    transition: transform 0.25s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  }
  .big-totp-toggle input:checked + .big-totp-slider { background: ${onColor}; }
  .big-totp-toggle input:checked + .big-totp-slider::before { transform: translateX(26px); }
  .big-totp-toggle input:focus-visible + .big-totp-slider {
    box-shadow: 0 0 0 3px rgba(25,118,210,0.35);
  }
`;


const passwordRules = [
  {
    label: "Minimum of 8 characters",
    labelTl: "Dapat hindi bababa sa 8 na letra o karakter",
    test: (pw) => pw.length >= 8,
  },
  {
    label: "At least one lowercase letter (e.g. abc)",
    labelTl: "Dapat may isa mang maliit na letra (halimbawa: abc)",
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    label: "At least one uppercase letter (e.g. ABC)",
    labelTl: "Dapat may isa mang malaking letra (halimbawa: ABC)",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    label: "At least one number (e.g. 123)",
    labelTl: "Dapat may isa mang numero (halimbawa: 123)",
    test: (pw) => /\d/.test(pw),
  },
  {
    label: "At least one special character (! # $ ^ * @ - . < > _ & % + = ?)",
    labelTl: "Dapat may isa mang espesyal na karakter (! # $ ^ * @ - . < > _ & % + = ?)",
    test: (pw) => /[!#$^*@\-.<>_&%+=?]/.test(pw),
  },
];


const StudentResetPassword = () => {
  const settings = useContext(SettingsContext);

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

  useEffect(() => {
    if (!settings) return;
    if (settings.title_color) setTitleColor(settings.title_color);
    if (settings.subtitle_color) setSubtitleColor(settings.subtitle_color);
    if (settings.border_color) setBorderColor(settings.border_color);
    if (settings.main_button_color) setMainButtonColor(settings.main_button_color);
  }, [settings]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validations, setValidations] = useState([]);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [totpEnabled, setTotpEnabled] = useState(true);
  const [totpUpdating, setTotpUpdating] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    if (!(storedUser && storedRole && storedID && storedRole === "student")) {
      window.location.href = "/login";
    }
  }, []);

  // ── Fetch TOTP setting ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchTotpSetting = async () => {
      try {
        const person_id = localStorage.getItem("person_id");
        const res = await axios.get(
          `${API_BASE_URL}/api/get-otp-setting/user/${person_id}`
        );
        setTotpEnabled(res.data.require_otp === 1);
      } catch (err) {
        console.error("Failed to load TOTP setting", err);
      }
    };
    fetchTotpSetting();
  }, []);

  // ── FIX: capture newValue before any async/setState calls ──────────────
  const handleTotpToggle = async (e) => {
    const newValue = e.target.checked;   // capture immediately
    if (totpUpdating) return;
    setTotpUpdating(true);
    setTotpEnabled(newValue);            // optimistic update

    try {
      const person_id = localStorage.getItem("person_id");
      const res = await axios.post(`${API_BASE_URL}/api/update-otp-setting`, {
        type: "user",
        person_id,
        require_otp: newValue ? 1 : 0,  // use captured value, NOT state
      });
      setSnack({ open: true, message: res.data.message, severity: "success" });
    } catch (err) {
      setTotpEnabled(!newValue);         // roll back on failure
      setSnack({
        open: true,
        message: err.response?.data?.message || "Failed to update setting",
        severity: "error",
      });
    } finally {
      setTotpUpdating(false);
    }
  };

  // ── Password validation ─────────────────────────────────────────────────
  useEffect(() => {
    setValidations(passwordRules.map((rule) => rule.test(newPassword)));
  }, [newPassword]);

  const isValid = validations.every(Boolean) && newPassword === confirmPassword;
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const person_id = localStorage.getItem("person_id");
      const response = await axios.post(`${API_BASE_URL}/api/student-change-password`, {
        person_id, currentPassword, newPassword,
      });
      setSnack({ open: true, message: response.data.message, severity: "success" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      localStorage.removeItem("force_password_change");
      window.dispatchEvent(new Event("password_changed"));
      setTimeout(() => navigate("/student_dashboard"), 1500);
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || "Error updating password.", severity: "error" });
    }
  };

  const toggleShowPassword = (field) =>
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));

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
    <Box sx={{
      minHeight: "calc(100vh - 150px)", overflowY: "auto",
      backgroundColor: "transparent", mt: 1,
      p: { xs: 1, sm: 2 },
    }}>
      <style>{makeToggleStyles(mainButtonColor)}</style>

      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Typography variant="h4" sx={{
          fontWeight: "bold", color: titleColor,
          fontSize: { xs: "22px", sm: "28px", md: "36px" },
        }}>
          SECURITY SETTINGS
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Paper elevation={6} sx={{
          p: { xs: 2, sm: 3 },
          width: "100%", maxWidth: "540px",
          borderRadius: 4, backgroundColor: "#fff",
          border: `1px solid ${borderColor}`,
          boxShadow: "0px 4px 20px rgba(0,0,0,0.1)",
          mb: 6,
        }}>
          {/* Icon + title */}
          <Box textAlign="center" mb={2}>
            <Settings sx={{ fontSize: { xs: 60, sm: 70 }, color: "#000", backgroundColor: "#f0f0f0", borderRadius: "50%", p: 1 }} />
            <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, color: subtitleColor, fontSize: { xs: "18px", sm: "22px" } }}>
              SETTINGS
            </Typography>
            <Typography fontSize={13} color="text.secondary">
              Update your password and authentication settings.
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* ── Google Authenticator toggle ── */}
          <Box sx={{
            mt: 2, mb: 3, p: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            border: totpEnabled ? "1.5px solid #1976d2" : "1.5px solid #e0e0e0",
            backgroundColor: totpEnabled ? "#f0f6ff" : "#fafafa",
            transition: "all 0.2s",
            opacity: totpUpdating ? 0.7 : 1,
          }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{
                  width: { xs: 40, sm: 44 }, height: { xs: 40, sm: 44 },
                  borderRadius: "50%",
                  bgcolor: totpEnabled ? mainButtonColor : "#bdbdbd",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "background-color 0.2s",
                }}>
                  {totpEnabled
                    ? <PhoneAndroidIcon sx={{ color: "#fff", fontSize: { xs: 20, sm: 22 } }} />
                    : <LockOpenIcon sx={{ color: "#fff", fontSize: { xs: 20, sm: 22 } }} />
                  }
                </Box>
                <Box>
                  <Typography fontWeight={700} fontSize={{ xs: 13, sm: 14 }}>
                    Google Authenticator
                  </Typography>
                  <Typography fontSize={12} color="text.secondary">
                    Two-factor login via authenticator app
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                <Chip
                  label={totpEnabled ? "ON" : "OFF"}
                  size="small"
                  sx={{
                    fontWeight: 700, fontSize: "11px",
                    bgcolor: totpEnabled ? "#e3f2fd" : "#f5f5f5",
                    color: totpEnabled ? "#1565c0" : "#757575",
                    border: totpEnabled ? "1px solid #90caf9" : "1px solid #e0e0e0",
                  }}
                />
                <label className="big-totp-toggle" aria-label="Toggle Google Authenticator">
                  <input
                    type="checkbox"
                    checked={totpEnabled}
                    onChange={handleTotpToggle}
                    disabled={totpUpdating}
                  />
                  <span className="big-totp-slider" />
                </label>
              </Box>
            </Box>

            {!totpEnabled && (
              <Box sx={{
                mt: 1.5, p: 1.5, bgcolor: "#fff8e1",
                borderRadius: 2, border: "1px solid #ffe082",
                display: "flex", gap: 1, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                <Typography fontSize={12} color="#5d4037" lineHeight={1.5}>
                  Google Authenticator is <strong>disabled</strong>. Anyone with
                  your password can log in without a second step. Re-enable it to
                  protect your account.
                </Typography>
              </Box>
            )}
            {totpEnabled && (
              <Box sx={{
                mt: 1.5, p: 1.5, bgcolor: "#e8f5e9",
                borderRadius: 2, border: "1px solid #a5d6a7",
                display: "flex", gap: 1, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
                <Typography fontSize={12} color="#2e7d32" lineHeight={1.5}>
                  Your account requires a Google Authenticator code every time
                  you log in. Keep the app installed on your phone.
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── Password form ── */}
          <form onSubmit={handleUpdate}>
            {[
              { key: "current", label: "Current Password", value: currentPassword, setter: setCurrentPassword },
              { key: "new", label: "New Password", value: newPassword, setter: setNewPassword },
              { key: "confirm", label: "Confirm Password", value: confirmPassword, setter: setConfirmPassword },
            ].map(({ key, label, value, setter }) => (
              <Box mb={2} key={key}>
                <InputLabel>{label}</InputLabel>
                <TextField
                  fullWidth size="small" variant="outlined"
                  type={showPassword[key] ? "text" : "password"}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  error={key === "confirm" && Boolean(confirmPassword && confirmPassword !== newPassword)}
                  helperText={key === "confirm" && confirmPassword && confirmPassword !== newPassword ? "Passwords do not match" : ""}
                  InputProps={{
                    style: { fontSize: 14 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => toggleShowPassword(key)} edge="end" size="small">
                          {showPassword[key] ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            ))}

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Your new password must include:
            </Typography>
             <List dense disablePadding>
                       {passwordRules.map((rule, i) => (
                         <ListItem key={i} sx={{ py: 0.35, px: 0, alignItems: "flex-start" }}>
                           <ListItemIcon sx={{ minWidth: 32, mt: "2px" }}>
                             {validations[i]
                               ? <CheckCircle sx={{ color: "green", fontSize: { xs: 18, sm: 22 } }} />
                               : <Cancel sx={{ color: "red", fontSize: { xs: 18, sm: 22 } }} />}
                           </ListItemIcon>
                           <ListItemText
                             primary={rule.label}
                             secondary={rule.labelTl}
                             primaryTypographyProps={{
                               fontSize: { xs: "12px", sm: "14px" },
                               color: validations[i] ? "green" : "inherit",
                               fontWeight: validations[i] ? 600 : 400,
                             }}
                             secondaryTypographyProps={{
                               fontSize: { xs: "11px", sm: "12.5px" },
                               fontStyle: "italic",
                               color: validations[i] ? "green" : "text.secondary",
                             }}
                           />
                         </ListItem>
                       ))}
                     </List>

            <Typography variant="body2" color="warning.main" sx={{ mt: 1, mb: 2, fontSize: 12 }}>
              Note: You are required to change your password to continue using the system securely.
            </Typography>

            <Button
              type="submit" fullWidth variant="contained" disabled={!isValid}
              sx={{
                py: 1.4, borderRadius: 2,
                backgroundColor: mainButtonColor,
                border: `1px solid ${borderColor}`,
                textTransform: "none", fontWeight: "bold",
                fontSize: { xs: 14, sm: 15 },
                "&:hover": { backgroundColor: "#1565c0" },
              }}
            >
              Update Password
            </Button>
          </form>
        </Paper>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity={snack.severity}
          onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentResetPassword;