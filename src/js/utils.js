/**
 * Utility functions for MIA.VN Warehouse Schedule System
 */

import { format, addDays, startOfMonth, endOfMonth, isWeekend } from "date-fns";
import { vi } from "date-fns/locale";

/**
 * Format date to Vietnamese locale
 * @param {Date} date - Date to format
 * @param {string} formatStr - Format string
 * @returns {string} Formatted date string
 */
export function formatDate(date, formatStr = "dd/MM/yyyy") {
  return format(date, formatStr, { locale: vi });
}

/**
 * Get days in month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {number} Number of days in month
 */
export function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

/**
 * Get first day of week for a month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {number} Day of week (0-6, 0 = Sunday)
 */
export function getFirstDayOfWeek(month, year) {
  return new Date(year, month - 1, 1).getDay();
}

/**
 * Check if date is weekend
 * @param {Date} date - Date to check
 * @returns {boolean} True if weekend
 */
export function isWeekendDay(date) {
  return isWeekend(date);
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));

  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Format number to Vietnamese currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @param {number} decimals - Number of decimal places
 * @returns {number} Percentage
 */
export function calculatePercentage(value, total, decimals = 1) {
  if (total === 0) return 0;
  return (
    Math.round((value / total) * 100 * Math.pow(10, decimals)) /
    Math.pow(10, decimals)
  );
}

/**
 * Parse time string to minutes
 * @param {string} timeStr - Time string (HH:MM)
 * @returns {number} Total minutes
 */
export function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes to time string
 * @param {number} minutes - Total minutes
 * @returns {string} Time string (HH:MM)
 */
export function minutesToTimeString(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Calculate hours between two times
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {Object} breakTime - Break time object with start and end
 * @returns {number} Total working hours
 */
export function calculateWorkingHours(startTime, endTime, breakTime = null) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  let totalMinutes = endMinutes - startMinutes;

  if (breakTime) {
    const breakStart = parseTimeToMinutes(breakTime.start);
    const breakEnd = parseTimeToMinutes(breakTime.end);
    totalMinutes -= breakEnd - breakStart;
  }

  return totalMinutes / 60;
}

/**
 * Get week days
 * @returns {Array} Array of week days in Vietnamese
 */
export function getWeekDays() {
  return ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
}

/**
 * Get month names
 * @returns {Array} Array of month names in Vietnamese
 */
export function getMonthNames() {
  return [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];
}

/**
 * Download file
 * @param {Blob} blob - File blob
 * @param {string} filename - File name
 */
export function downloadFile(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create CSV from data
 * @param {Array} headers - CSV headers
 * @param {Array} rows - CSV data rows
 * @param {string} delimiter - CSV delimiter
 * @returns {string} CSV string
 */
export function createCSV(headers, rows, delimiter = ",") {
  const csvHeaders = headers.join(delimiter);
  const csvRows = rows.map((row) =>
    row
      .map((cell) => {
        // Escape quotes and wrap in quotes if contains delimiter
        const escaped = String(cell).replace(/"/g, '""');
        return escaped.includes(delimiter) ? `"${escaped}"` : escaped;
      })
      .join(delimiter)
  );

  return "\ufeff" + [csvHeaders, ...csvRows].join("\n");
}

/**
 * Parse CSV data
 * @param {string} csvData - CSV string
 * @param {string} delimiter - CSV delimiter
 * @returns {Object} Parsed data with headers and rows
 */
export function parseCSV(csvData, delimiter = ",") {
  const lines = csvData.split("\n").filter((line) => line.trim());
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  });

  return { headers, rows };
}

/**
 * Get contrast color (black or white) based on background
 * @param {string} hexColor - Hex color code
 * @returns {string} 'black' or 'white'
 */
export function getContrastColor(hexColor) {
  // Convert hex to RGB
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "black" : "white";
}

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate phone number (Vietnam)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export function isValidPhone(phone) {
  const re = /^(0|84)(3|5|7|8|9)[0-9]{8}$/;
  return re.test(phone.replace(/\s/g, ""));
}

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object} Grouped object
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
}

/**
 * Sort array by multiple keys
 * @param {Array} array - Array to sort
 * @param {Array} keys - Keys to sort by (with direction)
 * @returns {Array} Sorted array
 */
export function sortByMultiple(array, keys) {
  return array.sort((a, b) => {
    for (const key of keys) {
      const prop = key.startsWith("-") ? key.slice(1) : key;
      const order = key.startsWith("-") ? -1 : 1;

      if (a[prop] < b[prop]) return -1 * order;
      if (a[prop] > b[prop]) return 1 * order;
    }
    return 0;
  });
}

/**
 * Calculate statistics from array of numbers
 * @param {Array} numbers - Array of numbers
 * @returns {Object} Statistics object
 */
export function calculateStats(numbers) {
  if (!numbers.length) {
    return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
  }

  const sum = numbers.reduce((a, b) => a + b, 0);
  const avg = sum / numbers.length;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  return { min, max, avg, sum, count: numbers.length };
}

/**
 * Wait for specified milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after timeout
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param {Function} func - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise} Result of function
 */
export async function retryWithBackoff(func, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await func();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i));
      }
    }
  }

  throw lastError;
}
