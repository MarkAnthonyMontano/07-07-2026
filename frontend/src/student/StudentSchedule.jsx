import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import axios from "axios";
import API_BASE_URL from "../apiConfig";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_LABELS = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

const TIME_SLOTS = [
  ["7:00 AM", "8:00 AM"],
  ["8:00 AM", "9:00 AM"],
  ["9:00 AM", "10:00 AM"],
  ["10:00 AM", "11:00 AM"],
  ["11:00 AM", "12:00 PM"],
  ["12:00 PM", "1:00 PM"],
  ["1:00 PM", "2:00 PM"],
  ["2:00 PM", "3:00 PM"],
  ["3:00 PM", "4:00 PM"],
  ["4:00 PM", "5:00 PM"],
  ["5:00 PM", "6:00 PM"],
  ["6:00 PM", "7:00 PM"],
  ["7:00 PM", "8:00 PM"],
  ["8:00 PM", "9:00 PM"],
];

const parseTime = (t) => new Date(`1970-01-01 ${t}`);

const StudentSchedule = () => {
  const settings = useContext(SettingsContext);

  const [titleColor, setTitleColor] = useState("#000000");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

  const [studentSchedule, setStudentSchedule] = useState([]);
  const [activeDay, setActiveDay] = useState("MON");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    if (!settings) return;
    if (settings.title_color) setTitleColor(settings.title_color);
    if (settings.border_color) setBorderColor(settings.border_color);
    if (settings.main_button_color) setMainButtonColor(settings.main_button_color);
  }, [settings]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    if (!storedID) { window.location.href = "/login"; return; }
    if (storedRole !== "student") { window.location.href = "/faculty_dashboard"; return; }
    fetchStudentSchedule(storedID);
  }, []);

  const fetchStudentSchedule = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_schedule/${id}`);
      setStudentSchedule(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const toWholeUnit = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? Math.round(num) : 0;
  };

  const sortedSchedule = [...studentSchedule].sort((a, b) =>
    (a.course_code || "").localeCompare(b.course_code || "")
  );

  const isTimeInSchedule = (start, end, day) =>
    studentSchedule.some((entry) => {
      if (entry.day_description !== day) return false;
      const slotStart = parseTime(start);
      const slotEnd = parseTime(end);
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);
      return slotStart >= schedStart && slotEnd <= schedEnd;
    });

  const getEntryForSlot = (start, day) => {
    const slotStart = parseTime(start);
    return studentSchedule.find((entry) => {
      if (entry.day_description !== day) return false;
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);
      return slotStart >= schedStart && slotStart < schedEnd;
    });
  };

  const hasAdjacentSchedule = (start, end, day, direction = "top") => {
    const minutesOffset = direction === "top" ? -60 : 60;
    const newStart = new Date(parseTime(start).getTime() + minutesOffset * 60000);
    const newEnd = new Date(parseTime(end).getTime() + minutesOffset * 60000);
    const currentEntry = getEntryForSlot(start, day);
    const adjacentEntry = studentSchedule.find((entry) => {
      if (entry.day_description !== day) return false;
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);
      return newStart >= schedStart && newEnd <= schedEnd;
    });
    if (!adjacentEntry) return false;
    if (currentEntry && adjacentEntry.course_code === currentEntry.course_code) return "same";
    return "different";
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

  const getCenterText = (start, day) => {
    const slotStart = parseTime(start);
    const SLOT_HEIGHT_REM = 2.5;

    for (const entry of studentSchedule) {
      if (entry.day_description !== day) continue;
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);
      if (!(slotStart >= schedStart && slotStart < schedEnd)) continue;

      const totalHours = Math.round((schedEnd - schedStart) / (1000 * 60 * 60));
      const idxInBlock = Math.round((slotStart - schedStart) / (1000 * 60 * 60));
      const isOdd = totalHours % 2 === 1;
      const centerIndex = isOdd ? (totalHours - 1) / 2 : totalHours / 2;
      const isCenter = idxInBlock === centerIndex;
      if (!isCenter) return "";

      let marginTop = isOdd ? 0 : -(SLOT_HEIGHT_REM / 2);
      if (!isOdd) marginTop = `calc(${marginTop}rem - 1rem)`;

      const fontSize = totalHours === 1 ? "10px" : "11px";
      return (
        <span style={{ position: "relative", display: "inline-block", textAlign: "center", width: "100%", fontSize, marginTop }}>
          <div style={{ width: "100%", padding: "0 2px" }}>
            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize }}>
              {entry.course_code}
            </span>
            <span style={{ display: "block", whiteSpace: "normal", wordBreak: "break-word", fontSize: "8px", lineHeight: 1.2 }}>
              {entry.room_description === "TBA" ? "TBA" : entry.room_description}
            </span>
            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: totalHours === 1 ? "8px" : "10px" }}>
              {entry.prof_lastname === "TBA" ? "TBA" : `Prof. ${entry.prof_lastname}`}
            </span>
          </div>
        </span>
      );
    }
    return "";
  };

  // ── Mobile: card list for the selected day ──
  const renderMobileDaySchedule = () => {
    const dayEntries = studentSchedule
      .filter((e) => e.day_description === activeDay)
      .sort((a, b) => parseTime(a.school_time_start) - parseTime(b.school_time_start));

    if (!dayEntries.length) {
      return (
        <Box sx={{ textAlign: "center", py: 6, color: "#888" }}>
          <Typography sx={{ fontSize: 14 }}>No classes on {DAY_LABELS[activeDay]}</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
        {dayEntries.map((entry, i) => (
          <Box
            key={i}
            sx={{
              background: "#fffde7",
              border: `1.5px solid ${borderColor}`,
              borderLeft: `5px solid ${mainButtonColor}`,
              borderRadius: "8px",
              p: 1.5,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: mainButtonColor }}>
              {entry.course_code}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#333", mt: 0.3 }}>
              {entry.course_description}
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mt: 0.8, flexWrap: "wrap" }}>
              <Typography sx={{ fontSize: 11, color: "#555" }}>
                🕐 {entry.school_time_start} – {entry.school_time_end}
              </Typography>
              <Typography sx={{ fontSize: 11, color: "#555" }}>
                📍 {entry.room_description}
              </Typography>
              <Typography sx={{ fontSize: 11, color: "#555" }}>
                👤 {entry.prof_lastname === "TBA" ? "TBA" : `Prof. ${entry.prof_lastname}`}
              </Typography>
              <Typography sx={{ fontSize: 11, color: "#555" }}>
                📚 {entry.program_code} {entry.section_description}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  // ── Desktop: full weekly grid ──
  const renderDesktopGrid = () => (
    <Box sx={{ overflowX: "auto", width: "100%" }}>
      <table style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ display: "flex", alignItems: "center" }}>
            <td style={{ minWidth: "6.5rem", minHeight: "2.2rem", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${borderColor}`, fontSize: 14 }}>
              TIME
            </td>
            <td style={{ padding: 0, margin: 0 }}>
              <div style={{ minWidth: "6.6rem", textAlign: "center", border: `1px solid ${borderColor}`, borderLeft: 0, borderBottom: 0, fontSize: 14 }}>DAY</div>
              <p style={{ minWidth: "6.6rem", textAlign: "center", border: `1px solid ${borderColor}`, borderLeft: 0, fontSize: "11.5px", fontWeight: "bold", marginTop: "-3px" }}>Official Time</p>
            </td>
            {DAYS.map((day) => (
              <td key={day} style={{ padding: 0, margin: 0 }}>
                <div style={{ minWidth: "8.5rem", textAlign: "center", border: `1px solid ${borderColor}`, borderLeft: 0, borderBottom: 0, fontSize: 14 }}>{DAY_LABELS[day].toUpperCase()}</div>
                <p style={{ minWidth: "8.5rem", textAlign: "center", border: `1px solid ${borderColor}`, borderLeft: 0, fontSize: "11.5px", marginTop: "-3px" }}>7:00AM - 9:00PM</p>
              </td>
            ))}
          </tr>
        </thead>
        <tbody style={{ display: "flex", flexDirection: "column", marginTop: "-0.1px" }}>
          {TIME_SLOTS.map(([start, end]) => (
            <tr key={start} style={{ display: "flex", width: "100%" }}>
              <td style={{ margin: 0, padding: 0, minWidth: "13.1rem" }}>
                <div style={{ height: "2.5rem", border: `1px solid ${borderColor}`, borderTop: 0, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {start.replace(":00 ", ":00 ")} - {end}
                </div>
              </td>
              {DAYS.map((day) => {
                const inSched = isTimeInSchedule(start, end, day);
                const topAdj = hasAdjacentSchedule(start, end, day, "top");
                const botAdj = hasAdjacentSchedule(start, end, day, "bottom");
                return (
                  <td key={day} style={{ margin: 0, padding: 0, minWidth: "8.5rem" }}>
                    <div style={{
                      height: "2.5rem",
                      border: `1px solid ${borderColor}`,
                      borderTop: inSched && topAdj === "same" ? 0 : `1px solid ${borderColor}`,
                      borderBottom: inSched && botAdj === "same" ? 0 : `1px solid ${borderColor}`,
                      borderLeft: 0,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: inSched ? "#fef08a" : "transparent",
                    }}>
                      {getCenterText(start, day)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "calc(100vh - 150px)", overflowY: "auto", backgroundColor: "transparent", mt: 1, p: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2, px: { xs: 0, sm: 2 } }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: { xs: "22px", sm: "28px", md: "36px" } }}>
          CLASS SCHEDULE
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      {/* Table */}
      <TableContainer component={Paper} sx={{ mb: 3, mx: "auto", width: "100%", maxWidth: "1400px", overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: isMobile ? 600 : "auto" }}>
          <TableHead sx={{ backgroundColor: settings?.header_color || "#1976d2", border: `1px solid ${borderColor}` }}>
            <TableRow>
              {["#", "Course Description", "Course Code", "Lec", "Lab", "Units", "Section", "Schedule"].map((h) => (
                <TableCell key={h} sx={{ color: "white", border: `1px solid ${borderColor}`, fontSize: { xs: "0.65rem", sm: "0.75rem" }, whiteSpace: "nowrap" }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedSchedule.map((row, index) => (
              <TableRow key={index}>
                {[
                  index + 1,
                  row.course_description,
                  row.course_code,
                  1,
                  row.lab_unit == null ? "" : toWholeUnit(row.lab_unit),
                  row.course_unit == null ? "" : toWholeUnit(row.course_unit),
                  `${row.program_code} ${row.section_description}`,
                  `${row.day_description}, ${row.school_time_start} - ${row.school_time_end} ${row.room_description}`,
                ].map((cell, ci) => (
                  <TableCell key={ci} sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" }, border: `1px solid ${borderColor}` }}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} style={{ border: `1px solid ${borderColor}` }} />
              <TableCell colSpan={2} style={{ fontWeight: "600", border: `1px solid ${borderColor}`, fontSize: "0.75rem" }}>Total Units</TableCell>
              <TableCell style={{ border: `1px solid ${borderColor}`, fontSize: "0.75rem" }}>
                {sortedSchedule.reduce((total, row) => total + toWholeUnit(row.course_unit), 0)}
              </TableCell>
              <TableCell colSpan={2} style={{ border: `1px solid ${borderColor}` }} />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Weekly Grid Section */}
      <Box sx={{ border: `1px solid ${borderColor}`, p: { xs: 1, sm: "1rem" }, overflowX: "auto" }}>

        {/* Mobile: day tab switcher */}
        {isMobile ? (
          <>
            {/* Day pill tabs */}
            <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto", pb: 1, mb: 1, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
              {DAYS.map((day) => {
                const hasClass = studentSchedule.some((e) => e.day_description === day);
                const isActive = activeDay === day;
                return (
                  <Box
                    key={day}
                    onClick={() => setActiveDay(day)}
                    sx={{
                      flexShrink: 0,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: "20px",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 400,
                      border: `1.5px solid ${isActive ? mainButtonColor : borderColor}`,
                      backgroundColor: isActive ? mainButtonColor : "transparent",
                      color: isActive ? "#fff" : hasClass ? mainButtonColor : "#999",
                      position: "relative",
                      transition: "all 0.18s ease",
                    }}
                  >
                    {day}
                    {hasClass && !isActive && (
                      <Box sx={{ position: "absolute", top: 2, right: 2, width: 5, height: 5, borderRadius: "50%", backgroundColor: mainButtonColor }} />
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* Day label */}
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: mainButtonColor, mb: 1 }}>
              {DAY_LABELS[activeDay]}
            </Typography>

            {renderMobileDaySchedule()}
          </>
        ) : (
          renderDesktopGrid()
        )}
      </Box>
    </Box>
  );
};

export default StudentSchedule;
