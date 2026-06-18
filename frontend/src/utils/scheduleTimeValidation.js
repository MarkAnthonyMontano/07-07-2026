export const SCHEDULE_TIME_MIN = "07:00";
export const SCHEDULE_TIME_MAX = "21:00";
export const SCHEDULE_TIME_STEP_SECONDS = 1800;

const parseTime24 = (time24) => {
  if (!time24 || typeof time24 !== "string") return null;
  const match = time24.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes, totalMinutes: hours * 60 + minutes };
};

export const isValidScheduleTimeSlot = (time24) => {
  const parsed = parseTime24(time24);
  if (!parsed) return false;
  if (parsed.minutes !== 0 && parsed.minutes !== 30) return false;

  const minMinutes = 7 * 60;
  const maxMinutes = 21 * 60;
  return parsed.totalMinutes >= minMinutes && parsed.totalMinutes <= maxMinutes;
};

export const getScheduleTimeValidationMessage = (
  time24,
  label = "Time",
) => {
  if (!time24) return "";

  const parsed = parseTime24(time24);
  if (!parsed) {
    return `${label} is invalid.`;
  }

  if (parsed.minutes !== 0 && parsed.minutes !== 30) {
    return `${label} must use 30-minute increments only (e.g. 7:00, 7:30, 8:00).`;
  }

  const minMinutes = 7 * 60;
  const maxMinutes = 21 * 60;
  if (parsed.totalMinutes < minMinutes || parsed.totalMinutes > maxMinutes) {
    return `${label} must be between 7:00 AM and 9:00 PM.`;
  }

  return "";
};

export const validateScheduleTimePair = (startTime24, endTime24) => {
  const startMessage = getScheduleTimeValidationMessage(
    startTime24,
    "Start time",
  );
  if (startMessage) {
    return { valid: false, message: startMessage };
  }

  const endMessage = getScheduleTimeValidationMessage(endTime24, "End time");
  if (endMessage) {
    return { valid: false, message: endMessage };
  }

  const start = parseTime24(startTime24);
  const end = parseTime24(endTime24);
  if (end.totalMinutes <= start.totalMinutes) {
    return { valid: false, message: "End time must be after start time." };
  }

  return { valid: true, message: "" };
};
