import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Grid,
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  TableContainer,
  Checkbox,
  ListItemText,
  Collapse,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
const API = `${API_BASE_URL}/api/email-templates`;
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PeopleIcon from "@mui/icons-material/People";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";


export default function EmailTemplateManager() {
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
    } else {
      setFetchedLogo(EaristLogo);
    }

    if (settings.company_name) setCompanyName(settings.company_name);
    if (settings.short_term) setShortTerm(settings.short_term);
    if (settings.campus_address) setCampusAddress(settings.campus_address);
  }, [settings]);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");

  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const pageId = 67;
  const [employeeID, setEmployeeID] = useState("");

  const getAuditHeaders = () => ({
    headers: {
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
    },
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);
      setEmployeeID(storedEmployeeID);

      if (storedRole === "registrar") {
        checkAccess(storedEmployeeID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (employeeID) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
        setCanCreate(Number(response.data?.can_create) === 1);
        setCanEdit(Number(response.data?.can_edit) === 1);
        setCanDelete(Number(response.data?.can_delete) === 1);
      } else {
        setHasAccess(false);
        setCanCreate(false);
        setCanEdit(false);
        setCanDelete(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setCanCreate(false);
      setCanEdit(false);
      setCanDelete(false);
      setLoading(false);
    }
  };

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    sender_name: "",
    department_id: "",
    program_id: "",
    is_active: true,
  });
  const [editing, setEditing] = useState(null);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // ── Tagged employees panel ──────────────────────────────────────────────────
  const [expandedTemplateId, setExpandedTemplateId] = useState(null);
  const [taggedEmployeesByTemplate, setTaggedEmployeesByTemplate] = useState({});
  const [loadingTagged, setLoadingTagged] = useState({});

  // ── Untag (remove single employee) dialog ──────────────────────────────────
  const [openUntagDialog, setOpenUntagDialog] = useState(false);
  const [untagTarget, setUntagTarget] = useState(null); // { templateId, templateName, employeeId, employeeName }

  const toggleExpandTemplate = async (templateId) => {
    if (expandedTemplateId === templateId) {
      setExpandedTemplateId(null);
      return;
    }

    setExpandedTemplateId(templateId);

    // Only fetch if not already loaded
    if (!taggedEmployeesByTemplate[templateId]) {
      setLoadingTagged((prev) => ({ ...prev, [templateId]: true }));
      try {
        const res = await axios.get(`${API}/${templateId}/employees`);
        setTaggedEmployeesByTemplate((prev) => ({
          ...prev,
          [templateId]: res.data || [],
        }));
      } catch (err) {
        console.error("Failed to load tagged employees:", err);
        showSnack("Failed to load tagged employees", "error");
      } finally {
        setLoadingTagged((prev) => ({ ...prev, [templateId]: false }));
      }
    }
  };

  const refreshTaggedEmployees = async (templateId) => {
    try {
      const res = await axios.get(`${API}/${templateId}/employees`);
      setTaggedEmployeesByTemplate((prev) => ({
        ...prev,
        [templateId]: res.data || [],
      }));
    } catch (err) {
      console.error("Failed to refresh tagged employees:", err);
    }
  };

  const handleOpenUntagDialog = (template, employee) => {
    if (!canDelete) {
      showSnack("You do not have permission to remove tagged employees", "error");
      return;
    }

    const employeeName = [employee.last_name, employee.first_name, employee.middle_name]
      .filter(Boolean)
      .join(", ") || employee.email || String(employee.employee_id);

    setUntagTarget({
      templateId: template.template_id,
      templateName: template.sender_name,
      employeeId: employee.employee_id,
      employeeName,
    });
    setOpenUntagDialog(true);
  };

  const handleConfirmUntag = async () => {
    if (!untagTarget) return;

    const { templateId, employeeId } = untagTarget;

    try {
      // Fetch current tagged employees, remove this one, then save
      const res = await axios.get(`${API}/${templateId}/employees`);
      const currentIds = (res.data || [])
        .map((e) => String(e.employee_id))
        .filter((id) => id !== String(employeeId));

      if (currentIds.length === 0) {
        showSnack(
          "Cannot remove — at least one employee must remain tagged.",
          "warning"
        );
        setOpenUntagDialog(false);
        setUntagTarget(null);
        return;
      }

      await axios.put(
        `${API}/${templateId}/employees`,
        { employee_ids: currentIds },
        getAuditHeaders()
      );

      showSnack("Employee removed from template successfully", "success");
      await refreshTaggedEmployees(templateId);
      loadTemplates(); // refresh tagged_employee_count in main table
    } catch (err) {
      console.error("Failed to untag employee:", err);
      showSnack("Failed to remove employee from template", "error");
    } finally {
      setOpenUntagDialog(false);
      setUntagTarget(null);
    }
  };

  // ── Existing CRUD ───────────────────────────────────────────────────────────
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await axios.get(API);
      setRows(res.data || []);
    } catch (err) {
      console.error("Failed to load templates:", err);
      showSnack("Failed to load templates", "error");
    }
  };

  const showSnack = (message, severity = "info") =>
    setSnack({ open: true, message, severity });

  const handleAdd = async () => {
    if (!canCreate) {
      showSnack("You do not have permission to create email templates", "error");
      return false;
    }
    if (!form.sender_name.trim()) {
      showSnack("Sender name is required", "warning");
      return false;
    }
    if (!form.department_id || !form.program_id) {
      showSnack("Department and program are required", "warning");
      return false;
    }

    try {
      await axios.post(API, form, getAuditHeaders());
      showSnack("Template successfully added", "success");
      setForm({ sender_name: "", department_id: "", program_id: "", is_active: true });
      loadTemplates();
      return true;
    } catch (err) {
      console.error("Error adding template:", err);
      showSnack(err.response?.data?.error || "Failed to add template", "error");
      return false;
    }
  };

  const [openFormDialog, setOpenFormDialog] = useState(false);

  const handleEdit = (row) => {
    if (!canEdit) {
      showSnack("You do not have permission to edit email templates", "error");
      return;
    }
    setEditing(row.template_id);
    setForm({
      sender_name: row.sender_name || "",
      department_id: row.department_id || "",
      program_id: row.program_id || "",
      is_active: !!row.is_active,
    });
  };

  const handleUpdate = async () => {
    if (!editing) return false;
    if (!canEdit) {
      showSnack("You do not have permission to edit email templates", "error");
      return false;
    }
    if (!form.sender_name.trim() || !form.department_id || !form.program_id) {
      showSnack("Gmail account, department, and program are required", "warning");
      return false;
    }

    try {
      await axios.put(`${API}/${editing}`, form, getAuditHeaders());
      showSnack("Template updated successfully", "success");
      setEditing(null);
      setForm({ sender_name: "", department_id: "", program_id: "", is_active: true });
      loadTemplates();
      return true;
    } catch (err) {
      console.error("Error updating template:", err);
      showSnack(err.response?.data?.error || "Failed to update template", "error");
      return false;
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const paginatedRows = rows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const handleDelete = async (id) => {
    if (!canDelete) {
      showSnack("You do not have permission to delete email templates", "error");
      return;
    }
    try {
      await axios.delete(`${API}/${id}`, getAuditHeaders());
      showSnack("Template deleted successfully", "success");
      loadTemplates();
    } catch (err) {
      console.error("Error deleting template:", err);
      showSnack("Failed to delete template", "error");
    }
  };

  const handleCloseSnack = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [openTagDialog, setOpenTagDialog] = useState(false);
  const [taggingTemplate, setTaggingTemplate] = useState(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  const resetForm = () => {
    setForm({ sender_name: "", department_id: "", program_id: "", is_active: true });
  };

  const filteredPrograms = programs.filter(
    (program) =>
      !form.department_id ||
      String(program.dprtmnt_id) === String(form.department_id)
  );

  const getProgramLabel = (program) => {
    if (!program) return "N/A";
    const major = program.major ? ` (${program.major})` : "";
    return `${program.program_code || "N/A"} - ${program.program_description || "Unknown Program"}${major}`;
  };

  const getEmployeeLabel = (employeeId) => {
    const employee = employees.find(
      (item) => String(item.employee_id) === String(employeeId)
    );
    if (!employee) return employeeId;
    const name = [employee.last_name, employee.first_name, employee.middle_name]
      .filter(Boolean)
      .join(", ");
    return `${employee.employee_id} - ${name || employee.email || "Employee"}`;
  };

  const handleOpenTagDialog = async (row) => {
    if (!canEdit) {
      showSnack("You do not have permission to tag employees", "error");
      return;
    }
    setTaggingTemplate(row);
    setSelectedEmployeeIds([]);
    setOpenTagDialog(true);

    try {
      const res = await axios.get(`${API}/${row.template_id}/employees`);
      setSelectedEmployeeIds(
        (res.data || []).map((employee) => String(employee.employee_id))
      );
    } catch (err) {
      console.error("Failed to load tagged employees:", err);
      showSnack("Failed to load tagged employees", "error");
    }
  };

  const handleSaveTaggedEmployees = async () => {
    if (!taggingTemplate) return;
    if (selectedEmployeeIds.length === 0) {
      showSnack("Please select at least one employee", "warning");
      return;
    }

    try {
      await axios.put(
        `${API}/${taggingTemplate.template_id}/employees`,
        { employee_ids: selectedEmployeeIds },
        getAuditHeaders()
      );
      showSnack("Employees tagged successfully", "success");
      setOpenTagDialog(false);
      setTaggingTemplate(null);
      setSelectedEmployeeIds([]);
      loadTemplates();

      // Refresh expanded panel if open
      if (expandedTemplateId === taggingTemplate.template_id) {
        await refreshTaggedEmployees(taggingTemplate.template_id);
      } else {
        // Invalidate cache so next expand re-fetches
        setTaggedEmployeesByTemplate((prev) => {
          const next = { ...prev };
          delete next[taggingTemplate.template_id];
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to save tagged employees:", err);
      showSnack("Failed to save tagged employees", "error");
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/departments`);
        setDepartments(res.data || []);
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/applied_program`);
        setPrograms(res.data || []);
      } catch (err) {
        console.error("Failed to fetch programs", err);
      }
    };

    const fetchEmployees = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/get_employee`);
        setEmployees(res.data || []);
      } catch (err) {
        console.error("Failed to fetch employees", err);
      }
    };

    fetchPrograms();
    fetchEmployees();
  }, []);

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  // ─── Pagination bar (reusable) ─────────────────────────────────────────────
  const paginationBar = (
    <TableCell
      colSpan={10}
      sx={{
        border: `1px solid ${borderColor}`,
        py: 0.5,
        backgroundColor: settings?.header_color || "#1976d2",
        color: "white",
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography fontSize="14px" fontWeight="bold" color="white">
          Total Registered Email Accounts: {rows.length}
        </Typography>

        <Box display="flex" alignItems="center" gap={1}>
          {[
            { label: "First", action: () => setCurrentPage(1), disabled: currentPage === 1 },
            { label: "Prev", action: () => setCurrentPage((p) => Math.max(p - 1, 1)), disabled: currentPage === 1 },
          ].map(({ label, action, disabled }) => (
            <Button
              key={label}
              onClick={action}
              disabled={disabled}
              variant="outlined"
              size="small"
              sx={{
                minWidth: 80,
                color: "white",
                borderColor: "white",
                backgroundColor: "transparent",
                "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 },
              }}
            >
              {label}
            </Button>
          ))}

          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              displayEmpty
              sx={{
                fontSize: "12px",
                height: 36,
                color: "white",
                border: "1px solid white",
                backgroundColor: "transparent",
                ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                "& svg": { color: "white" },
              }}
              MenuProps={{ PaperProps: { sx: { maxHeight: 200, backgroundColor: "#fff" } } }}
            >
              {Array.from({ length: totalPages }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  Page {i + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography fontSize="11px" color="white">
            of {totalPages} page{totalPages > 1 ? "s" : ""}
          </Typography>

          {[
            { label: "Next", action: () => setCurrentPage((p) => Math.min(p + 1, totalPages)), disabled: currentPage === totalPages },
            { label: "Last", action: () => setCurrentPage(totalPages), disabled: currentPage === totalPages },
          ].map(({ label, action, disabled }) => (
            <Button
              key={label}
              onClick={action}
              disabled={disabled}
              variant="outlined"
              size="small"
              sx={{
                minWidth: 80,
                color: "white",
                borderColor: "white",
                backgroundColor: "transparent",
                "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 },
              }}
            >
              {label}
            </Button>
          ))}
        </Box>
      </Box>
    </TableCell>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        padding: 2,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}>
          EMAIL TEMPLATE MANAGER
        </Typography>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      {/* ── Top pagination + Add button ── */}
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                colSpan={10}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: settings?.header_color || "#1976d2",
                  color: "white",
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Registered Email Accounts: {rows.length}
                  </Typography>

                  <Box display="flex" alignItems="center" gap={1}>
                    {/* reuse the same pagination controls from paginationBar */}
                    {[
                      { label: "First", action: () => setCurrentPage(1), disabled: currentPage === 1 },
                      { label: "Prev", action: () => setCurrentPage((p) => Math.max(p - 1, 1)), disabled: currentPage === 1 },
                    ].map(({ label, action, disabled }) => (
                      <Button key={label} onClick={action} disabled={disabled} variant="outlined" size="small"
                        sx={{
                          minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                          "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                          "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 },
                        }}
                      >{label}</Button>
                    ))}

                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} displayEmpty
                        sx={{
                          fontSize: "12px", height: 36, color: "white", border: "1px solid white", backgroundColor: "transparent",
                          ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                          "& svg": { color: "white" },
                        }}
                        MenuProps={{ PaperProps: { sx: { maxHeight: 200, backgroundColor: "#fff" } } }}
                      >
                        {Array.from({ length: totalPages }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>Page {i + 1}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography fontSize="11px" color="white">
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>

                    {[
                      { label: "Next", action: () => setCurrentPage((p) => Math.min(p + 1, totalPages)), disabled: currentPage === totalPages },
                      { label: "Last", action: () => setCurrentPage(totalPages), disabled: currentPage === totalPages },
                    ].map(({ label, action, disabled }) => (
                      <Button key={label} onClick={action} disabled={disabled} variant="outlined" size="small"
                        sx={{
                          minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                          "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                          "&.Mui-disabled": { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 },
                        }}
                      >{label}</Button>
                    ))}

                    <Button
                      variant="contained"
                      sx={{
                        backgroundColor: "#1976d2",
                        color: "#fff",
                        fontWeight: "bold",
                        borderRadius: "8px",
                        width: "250px",
                        textTransform: "none",
                        px: 2,
                        border: "1px solid white",
                      }}
                      onClick={() => { setEditing(null); resetForm(); setOpenFormDialog(true); }}
                    >
                      + Add Email Account
                    </Button>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      {/* ── Main table + expandable tagged-employees panel ── */}
      <Grid item xs={12} md={7}>
        <Box
          sx={{
            maxHeight: "none",
            overflowY: "auto",
            backgroundColor: "#f5f5f5",
            color: "black",
            border: `1px solid ${borderColor}`,
            borderRadius: 1,
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ border: `1px solid ${borderColor}`, backgroundColor: "#F5F5F5", color: "#000" }}>#</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, backgroundColor: "#F5F5F5", color: "#000" }}>Gmail Account</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, backgroundColor: "#F5F5F5", color: "#000" }}>Department</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, backgroundColor: "#F5F5F5", color: "#000" }}>Program</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, backgroundColor: "#F5F5F5", color: "#000" }}>Tagged Employees</TableCell>
                <TableCell sx={{ border: `1px solid ${borderColor}`, backgroundColor: "#F5F5F5", color: "#000" }}>Active</TableCell>
                <TableCell
                  sx={{
                    width: "300px",
                    border: `1px solid ${borderColor}`,
                    backgroundColor: "#F5F5F5",
                    color: "#000",
                    textAlign: "center",
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody
              sx={{
                border: `1px solid ${borderColor}`,
                "& .MuiTableRow-root:nth-of-type(odd)": { backgroundColor: "#ffffff" },
                "& .MuiTableRow-root:nth-of-type(even)": { backgroundColor: "lightgray" },
              }}
            >
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ border: `1px solid ${borderColor}` }}>
                    No templates found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((r, index) => {
                  const isExpanded = expandedTemplateId === r.template_id;
                  const taggedEmployees = taggedEmployeesByTemplate[r.template_id] || [];
                  const isLoadingTagged = loadingTagged[r.template_id];

                  return (
                    <React.Fragment key={r.template_id}>
                      {/* ── Template row ── */}
                      <TableRow>
                        <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                          {(currentPage - 1) * rowsPerPage + index + 1}
                        </TableCell>
                        <TableCell sx={{ border: `1px solid ${borderColor}` }}>{r.sender_name}</TableCell>
                        <TableCell sx={{ border: `1px solid ${borderColor}` }}>{r.department_name || "N/A"}</TableCell>
                        <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                          {r.program_code
                            ? `${r.program_code} - ${r.program_description || ""}${r.major ? ` (${r.major})` : ""}`
                            : "N/A"}
                        </TableCell>

                        {/* Tagged employees count — clickable to expand */}
                        <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                          <Tooltip title={isExpanded ? "Hide tagged employees" : "View tagged employees"}>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => toggleExpandTemplate(r.template_id)}
                              startIcon={<PeopleIcon fontSize="small" />}
                              endIcon={isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                              sx={{
                                textTransform: "none",
                                color: "#1976d2",
                                fontWeight: 600,
                                fontSize: "13px",
                                px: 1,
                              }}
                            >
                              {Number(r.tagged_employee_count || 0)} Employee
                              {Number(r.tagged_employee_count || 0) !== 1 ? "s" : ""}
                            </Button>
                          </Tooltip>
                        </TableCell>

                        <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                          {r.is_active ? "Yes" : "No"}
                        </TableCell>

                        <TableCell sx={{ width: "300px", border: `1px solid ${borderColor}` }}>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                              variant="contained"
                              size="small"
                              sx={{
                                backgroundColor: "green",
                                color: "white",
                                borderRadius: "5px",
                                padding: "8px 14px",
                                width: "100px",
                                height: "40px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "5px",
                              }}
                              onClick={() => {
                                handleEdit(r);
                                setOpenFormDialog(true);
                              }}
                            >
                              <EditIcon fontSize="small" /> Edit
                            </Button>

                            <Button
                              variant="contained"
                              size="small"
                              sx={{
                                backgroundColor: "#1976d2",
                                color: "white",
                                borderRadius: "5px",
                                padding: "8px 14px",
                                width: "100px",
                                height: "40px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "5px",
                              }}
                              onClick={() => handleOpenTagDialog(r)}
                            >
                              <GroupAddIcon fontSize="small" /> Tag
                            </Button>

                            <Button
                              variant="contained"
                              size="small"
                              sx={{
                                backgroundColor: "#9E0000",
                                color: "white",
                                borderRadius: "5px",
                                padding: "8px 14px",
                                width: "100px",
                                height: "40px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "5px",
                              }}
                              onClick={() => {
                                setTemplateToDelete(r);
                                setOpenDeleteDialog(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" /> Delete
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>

                      {/* ── Expandable tagged employees sub-table ── */}
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          sx={{
                            p: 0,
                            border: isExpanded ? `1px solid ${borderColor}` : "none",
                            backgroundColor: "#EAF3FB",
                          }}
                        >
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2 }}>
                              {/* Sub-table header */}
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  mb: 1,
                                }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <PeopleIcon sx={{ color: "#1976d2", fontSize: 18 }} />
                                  <Typography
                                    fontSize="13px"
                                    fontWeight={700}
                                    color="#1976d2"
                                  >
                                    Tagged Employees — {r.sender_name}
                                  </Typography>
                                  <Chip
                                    label={taggedEmployees.length}
                                    size="small"
                                    sx={{ backgroundColor: "#1976d2", color: "white", fontSize: "11px", height: 20 }}
                                  />
                                </Box>
                              </Box>

                              {isLoadingTagged ? (
                                <Typography fontSize="13px" color="text.secondary" sx={{ py: 1 }}>
                                  Loading employees…
                                </Typography>
                              ) : taggedEmployees.length === 0 ? (
                                <Box
                                  sx={{
                                    py: 2,
                                    textAlign: "center",
                                    border: "1px dashed #b0bec5",
                                    borderRadius: 1,
                                    backgroundColor: "#f9f9f9",
                                  }}
                                >
                                  <Typography fontSize="13px" color="text.secondary">
                                    No employees tagged to this template yet.
                                  </Typography>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<GroupAddIcon />}
                                    sx={{ mt: 1, textTransform: "none", fontSize: "12px" }}
                                    onClick={() => handleOpenTagDialog(r)}
                                  >
                                    Tag Employees
                                  </Button>
                                </Box>
                              ) : (
                                <Table size="small" sx={{ border: `1px solid #ccc`, borderRadius: 1 }}>
                                  <TableHead>
                                    <TableRow sx={{ backgroundColor: "#1976d2" }}>
                                      <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "12px", border: "1px solid #90CAF9", py: 0.8 }}>#</TableCell>
                                      <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "12px", border: "1px solid #90CAF9", py: 0.8 }}>Employee ID</TableCell>
                                      <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "12px", border: "1px solid #90CAF9", py: 0.8 }}>Name</TableCell>
                                      <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "12px", border: "1px solid #90CAF9", py: 0.8 }}>Email</TableCell>
                                      <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "12px", border: "1px solid #90CAF9", py: 0.8 }}>Position</TableCell>
                                      <TableCell
                                        align="center"
                                        sx={{ color: "white", fontWeight: 700, fontSize: "12px", border: "1px solid #90CAF9", py: 0.8, width: 100 }}
                                      >
                                        Action
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {taggedEmployees.map((emp, empIndex) => {
                                      const fullName = [emp.last_name, emp.first_name, emp.middle_name]
                                        .filter(Boolean)
                                        .join(", ") || "—";
                                      return (
                                        <TableRow
                                          key={emp.employee_id}
                                          sx={{
                                            backgroundColor: empIndex % 2 === 0 ? "#ffffff" : "#e3f2fd",
                                            "&:hover": { backgroundColor: "#bbdefb" },
                                          }}
                                        >
                                          <TableCell sx={{ fontSize: "12px", border: "1px solid #cfd8dc", py: 0.7 }}>
                                            {empIndex + 1}
                                          </TableCell>
                                          <TableCell sx={{ fontSize: "12px", border: "1px solid #cfd8dc", py: 0.7 }}>
                                            {emp.employee_id}
                                          </TableCell>
                                          <TableCell sx={{ fontSize: "12px", border: "1px solid #cfd8dc", py: 0.7 }}>
                                            {fullName}
                                          </TableCell>
                                          <TableCell sx={{ fontSize: "12px", border: "1px solid #cfd8dc", py: 0.7 }}>
                                            {emp.email || "—"}
                                          </TableCell>
                                          <TableCell sx={{ fontSize: "12px", border: "1px solid #cfd8dc", py: 0.7 }}>
                                            {emp.position || "—"}
                                          </TableCell>
                                          <TableCell align="center" sx={{ border: "1px solid #cfd8dc", py: 0.7 }}>
                                            <Tooltip title="Remove from template">
                                              <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={<PersonRemoveIcon fontSize="small" />}
                                                sx={{
                                                  backgroundColor: "#9E0000",
                                                  color: "white",
                                                  fontSize: "11px",
                                                  textTransform: "none",
                                                  height: 30,
                                                  px: 1.5,
                                                  "&:hover": { backgroundColor: "#7b0000" },
                                                }}
                                                onClick={() => handleOpenUntagDialog(r, emp)}
                                              >
                                                Remove
                                              </Button>
                                            </Tooltip>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Box>
      </Grid>

      {/* ── Bottom pagination bar ── */}
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead>
            <TableRow>{paginationBar}</TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      {/* ── Delete Template Dialog ── */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the email template{" "}
            <b>{templateToDelete?.sender_name}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="error" variant="outlined" onClick={() => setOpenDeleteDialog(false)}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleDelete(templateToDelete.template_id);
              setOpenDeleteDialog(false);
              setTemplateToDelete(null);
            }}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Untag Employee Confirmation Dialog ── */}
      <Dialog open={openUntagDialog} onClose={() => setOpenUntagDialog(false)}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PersonRemoveIcon sx={{ color: "#9E0000" }} />
          Remove Tagged Employee
        </DialogTitle>
        <DialogContent>
          <Typography>
            Remove <b>{untagTarget?.employeeName}</b> from the email template{" "}
            <b>{untagTarget?.templateName}</b>?
          </Typography>
          <Typography fontSize="13px" color="text.secondary" sx={{ mt: 1 }}>
            This employee will no longer receive emails sent through this template.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="outlined"
            onClick={() => {
              setOpenUntagDialog(false);
              setUntagTarget(null);
            }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            startIcon={<PersonRemoveIcon />}
            onClick={handleConfirmUntag}
          >
            Yes, Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add / Edit Template Dialog ── */}
      <Dialog
        open={openFormDialog}
        onClose={() => setOpenFormDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle
          sx={{
            background: settings?.header_color || "#1976d2",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          {editing ? "Edit Email Template" : "New Email Registration"}
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, mt: 1 }}>
            Email Account Details
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sender Name"
                value={form.sender_name}
                onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Department"
                value={form.department_id || ""}
                onChange={(e) =>
                  setForm({ ...form, department_id: e.target.value, program_id: "" })
                }
              >
                <MenuItem value="">Select Department</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d.dprtmnt_id} value={d.dprtmnt_id}>
                    {d.dprtmnt_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Program"
                value={form.program_id || ""}
                onChange={(e) => setForm({ ...form, program_id: e.target.value })}
                disabled={!form.department_id}
              >
                <MenuItem value="">Select Program</MenuItem>
                {filteredPrograms.map((program) => (
                  <MenuItem key={program.curriculum_id} value={program.curriculum_id}>
                    {getProgramLabel(program)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            onClick={() => setOpenFormDialog(false)}
            color="error"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            sx={{ px: 4, fontWeight: 600, textTransform: "none" }}
            onClick={async () => {
              const saved = editing ? await handleUpdate() : await handleAdd();
              if (saved) setOpenFormDialog(false);
            }}
          >
            <SaveIcon fontSize="small" /> Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Tag Employees Dialog ── */}
      <Dialog
        open={openTagDialog}
        onClose={() => setOpenTagDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            background: settings?.header_color || "#1976d2",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          Tag Employees
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography fontWeight={700} sx={{ mb: 1, mt: 1 }}>
            {taggingTemplate?.sender_name || ""}
          </Typography>
          <Typography sx={{ mb: 2 }}>
            {taggingTemplate?.department_name || "N/A"} —{" "}
            {taggingTemplate?.program_code
              ? `${taggingTemplate.program_code} - ${taggingTemplate.program_description || ""}`
              : "N/A"}
          </Typography>

          <FormControl fullWidth>
            <InputLabel id="tag-employees-label">Employees</InputLabel>
            <Select
              labelId="tag-employees-label"
              multiple
              label="Employees"
              value={selectedEmployeeIds}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedEmployeeIds(
                  typeof value === "string" ? value.split(",") : value
                );
              }}
              renderValue={(selected) =>
                selected.length === 0
                  ? ""
                  : `${selected.length} employee${selected.length === 1 ? "" : "s"} selected`
              }
              MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
            >
              {employees.map((employee) => (
                <MenuItem key={employee.employee_id} value={String(employee.employee_id)}>
                  <Checkbox
                    checked={selectedEmployeeIds.includes(String(employee.employee_id))}
                  />
                  <ListItemText primary={getEmployeeLabel(employee.employee_id)} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 2, maxHeight: 160, overflowY: "auto" }}>
            {selectedEmployeeIds.map((employeeId) => (
              <Typography key={employeeId} fontSize="13px">
                {getEmployeeLabel(employeeId)}
              </Typography>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            onClick={() => setOpenTagDialog(false)}
            color="error"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveTaggedEmployees}
            variant="contained"
            sx={{ px: 4, fontWeight: 600, textTransform: "none" }}
          >
            <SaveIcon fontSize="small" /> Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleCloseSnack}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={handleCloseSnack} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}